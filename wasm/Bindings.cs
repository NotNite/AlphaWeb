using System.Runtime.InteropServices;
using System.Runtime.InteropServices.JavaScript;
using System.Text.Json;
using Lumina;

namespace AlphaWeb;

public partial class Bindings {
    private const string MountDir = "/game";
    private static GameData? Instance;

    [DllImport("fs", EntryPoint = "setup_fs")]
    private static extern void SetupFS();

    public static void Main() {
        try {
            SetupFS();
        } catch (Exception e) {
            Console.WriteLine(e);
        }
    }

    [JSExport]
    public static Task<bool> CreateLumina() {
        if (Instance != null) return Task.FromResult(false);

        try {
            Instance = new GameData($"{MountDir}/sqpack", new LuminaOptions() {
                PanicOnSheetChecksumMismatch = false,
                LoadMultithreaded = true
            });
        } catch (Exception e) {
            Console.WriteLine(e);
            return Task.FromResult(false);
        }

        return Task.FromResult(true);
    }

    [JSExport]
    public static Task<string> GetExcelSheets() => Task.FromResult(JsonSerializer.Serialize(
        Instance!.Excel.SheetNames.ToList(),
        SourceGenerationContext.Default.ListString));
}
