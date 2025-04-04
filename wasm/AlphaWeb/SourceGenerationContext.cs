using System.Text.Json.Serialization;

namespace AlphaWeb;

[JsonSerializable(typeof(List<string>))]
public partial class SourceGenerationContext : JsonSerializerContext;
