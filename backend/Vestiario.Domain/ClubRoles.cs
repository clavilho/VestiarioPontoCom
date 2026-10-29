namespace Vestiario.Domain;

public static class ClubRoles
{
    public static readonly string[] All = ["owner", "admin", "coach", "finance", "viewer"];
    public static readonly string[] Administrators = ["owner", "admin"];
    public static readonly string[] Finance = ["owner", "admin", "finance"];
    public static readonly string[] Sports = ["owner", "admin", "coach"];

    public static bool Includes(string? role, params string[] accepted) => role is not null && accepted.Contains(role);
}
