using System.Security.Cryptography;
using Google.Apis.Auth;
using MongoDB.Bson;
using MongoDB.Driver;
using Vestiario.Application.Contracts;
using Vestiario.Application.Ports;
using Vestiario.Domain;
using Vestiario.Infrastructure.Mongo;

namespace Vestiario.Infrastructure.Services;

public sealed class MongoAuthService(MongoContext context) : MongoService(context), IAuthService
{
    public async Task<object?> ExecuteAsync(AuthRequest request, string? bearerToken)
    {
        var action = request.Action.ToLowerInvariant();
        var users = Collection("users");
        var sessions = Collection("sessions");
        if (action == "signup")
        {
            var email = request.Email?.Trim().ToLowerInvariant() ?? "";
            if (email.Length == 0 || (request.Password?.Length ?? 0) < 8) throw new DomainException("Informe um e-mail e uma senha com pelo menos 8 caracteres.");
            if (await users.Find(Builders<BsonDocument>.Filter.Eq("email", email)).AnyAsync()) throw new DomainException("Já existe uma conta com este e-mail.");
            var id = Guid.NewGuid().ToString();
            var fullName = request.FullName ?? "";
            var now = DateTime.UtcNow.ToString("O");
            await users.InsertOneAsync(new BsonDocument { ["id"] = id, ["email"] = email, ["full_name"] = fullName, ["password_hash"] = HashPassword(request.Password!), ["created_at"] = now });
            await Collection("profiles").InsertOneAsync(new BsonDocument { ["id"] = id, ["full_name"] = fullName, ["language"] = "pt-BR", ["created_at"] = now });
            var token = await CreateSession(id);
            return Envelope(new { user = UserDto(id, email, fullName), session = new { access_token = token } });
        }
        if (action == "signin")
        {
            var email = request.Email?.Trim().ToLowerInvariant() ?? "";
            var user = await users.Find(Builders<BsonDocument>.Filter.Eq("email", email)).FirstOrDefaultAsync();
            if (user is null || !VerifyPassword(request.Password ?? "", user.GetValue("password_hash", "").AsString)) throw new DomainException("E-mail ou senha incorretos.");
            var token = await CreateSession(user["id"].AsString);
            return Envelope(new { user = UserDto(user["id"].AsString, email, user.GetValue("full_name", "").AsString), session = new { access_token = token } });
        }

        var tokenFromRequest = bearerToken ?? request.Token;
        var session = await FindSession(tokenFromRequest);
        var current = session is null ? null : await users.Find(Builders<BsonDocument>.Filter.Eq("id", session["user_id"].AsString)).FirstOrDefaultAsync();
        if (action == "signout")
        {
            if (!string.IsNullOrWhiteSpace(tokenFromRequest)) await sessions.DeleteOneAsync(Builders<BsonDocument>.Filter.Eq("token", tokenFromRequest));
            return Envelope(new { user = (object?)null, session = (object?)null });
        }
        if (action == "reset") throw new DomainException("Recuperação por e-mail precisa de SMTP configurado.");
        if (action == "user") return Envelope(new { user = current is null ? null : UserDto(current["id"].AsString, current["email"].AsString, current.GetValue("full_name", "").AsString) });
        if (action == "session") return Envelope(new { session = current is null ? null : new { access_token = tokenFromRequest, user = new { id = current["id"].AsString, email = current["email"].AsString } } });
        if (action == "updatepassword")
        {
            if (current is null) throw new DomainException("Sessão expirada.");
            if ((request.Password?.Length ?? 0) < 8) throw new DomainException("A senha precisa ter pelo menos 8 caracteres.");
            await users.UpdateOneAsync(Builders<BsonDocument>.Filter.Eq("id", current["id"].AsString), Builders<BsonDocument>.Update.Set("password_hash", HashPassword(request.Password!)));
            return Envelope(new { user = UserDto(current["id"].AsString, current["email"].AsString, current.GetValue("full_name", "").AsString) });
        }
        throw new DomainException("Ação de autenticação desconhecida.");
    }

    public async Task<object?> SignInWithGoogleAsync(GoogleAuthRequest request)
    {
        var clientId = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID");

        if (string.IsNullOrWhiteSpace(clientId))
        {
            throw new DomainException("O login Google ainda não foi configurado no backend.");
        }

        if (string.IsNullOrWhiteSpace(request.Credential))
        {
            throw new DomainException("O Google não retornou uma credencial válida.");
        }

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(
                request.Credential,
                new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = [clientId]
                });
        }
        catch
        {
            throw new DomainException("Não foi possível validar sua conta Google. Tente novamente.");
        }

        if (payload.EmailVerified != true
            || string.IsNullOrWhiteSpace(payload.Email)
            || string.IsNullOrWhiteSpace(payload.Subject))
        {
            throw new DomainException("A conta Google precisa ter um e-mail verificado.");
        }

        var users = Collection("users");
        var user = await users.Find(
            Builders<BsonDocument>.Filter.Eq("google_subject", payload.Subject)).FirstOrDefaultAsync();

        if (user is null)
        {
            user = await users.Find(
                Builders<BsonDocument>.Filter.Eq("email", payload.Email.Trim().ToLowerInvariant())).FirstOrDefaultAsync();

            if (user is null)
            {
                var userId = Guid.NewGuid().ToString();
                var fullName = payload.Name ?? payload.Email;
                var now = DateTime.UtcNow.ToString("O");
                user = new BsonDocument
                {
                    ["id"] = userId,
                    ["email"] = payload.Email.Trim().ToLowerInvariant(),
                    ["full_name"] = fullName,
                    ["google_subject"] = payload.Subject,
                    ["created_at"] = now
                };

                await users.InsertOneAsync(user);
                await Collection("profiles").InsertOneAsync(new BsonDocument
                {
                    ["id"] = userId,
                    ["full_name"] = fullName,
                    ["language"] = "pt-BR",
                    ["created_at"] = now
                });
            }
            else
            {
                var linkedSubject = user.GetValue("google_subject", BsonNull.Value);
                if (!linkedSubject.IsBsonNull && linkedSubject.AsString != payload.Subject)
                {
                    throw new DomainException("Este e-mail já está associado a outra conta Google.");
                }

                await users.UpdateOneAsync(
                    Builders<BsonDocument>.Filter.Eq("id", user["id"].AsString),
                    Builders<BsonDocument>.Update.Set("google_subject", payload.Subject));
            }
        }

        var token = await CreateSession(user["id"].AsString);
        return Envelope(new
        {
            user = UserDto(user["id"].AsString, user["email"].AsString, user.GetValue("full_name", "").AsString),
            session = new { access_token = token }
        });
    }
    private async Task<string> CreateSession(string userId)
    {
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        await Collection("sessions").InsertOneAsync(new BsonDocument { ["token"] = token, ["user_id"] = userId, ["expires_at"] = DateTime.UtcNow.AddDays(30) });
        return token;
    }

    private static object Envelope(object? data) => new { data, error = (object?)null };
    private static object UserDto(string id, string email, string name) => new { id, email, user_metadata = new { full_name = name } };
    private static string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, 150_000, HashAlgorithmName.SHA256, 32);
        return $"{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }
    private static bool VerifyPassword(string password, string stored)
    {
        try
        {
            var parts = stored.Split('.');
            var hash = Rfc2898DeriveBytes.Pbkdf2(password, Convert.FromBase64String(parts[0]), 150_000, HashAlgorithmName.SHA256, 32);
            return CryptographicOperations.FixedTimeEquals(hash, Convert.FromBase64String(parts[1]));
        }
        catch { return false; }
    }
}
