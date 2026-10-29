using Vestiario.Application.Ports;
using Vestiario.Infrastructure.Mongo;
using Vestiario.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

var mongoUri = Environment.GetEnvironmentVariable("MONGODB_URI")
    ?? builder.Configuration["Mongo:Uri"]
    ?? "mongodb://127.0.0.1:27017";
var mongoDatabase = Environment.GetEnvironmentVariable("MONGODB_DATABASE")
    ?? builder.Configuration["Mongo:Database"]
    ?? "vestiario";

builder.Services.AddSingleton(new MongoContext(mongoUri, mongoDatabase));
builder.Services.AddSingleton<IAuthService, MongoAuthService>();
builder.Services.AddSingleton<IWorkspaceService, MongoWorkspaceService>();
builder.Services.AddSingleton<IDataService, MongoDataService>();
builder.Services.AddSingleton<IRpcService, MongoRpcService>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
var configuredOrigins = builder.Configuration["Cors:AllowedOrigins"]?
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    ?? Array.Empty<string>();
var frontendOrigins = configuredOrigins
    .Concat(["http://localhost:5173", "http://localhost:3000"])
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();
builder.Services.AddCors(options =>
{
    options.AddPolicy("frontend", policy => policy
        .WithOrigins(frontendOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("frontend");
app.UseAuthorization();
await app.Services.GetRequiredService<MongoContext>().EnsureIndexesAsync();
app.MapControllers();
app.Run();
