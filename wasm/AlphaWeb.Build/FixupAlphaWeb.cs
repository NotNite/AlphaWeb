using System.Security.Cryptography;
using System.Text;
using Microsoft.Build.Framework;
using Task = Microsoft.Build.Utilities.Task;

namespace AlphaWeb.Build;

public class FixupAlphaWeb : Task {
    [Required] public string FrameworkDirectory { get; set; } = null!;
    [Required] public string WorkerJankPath { get; set; } = null!;

    public override bool Execute() {
        this.Log.LogMessage(MessageImportance.High, this.FrameworkDirectory);
        if (!Directory.Exists(this.FrameworkDirectory)) throw new Exception("Framework directory does not exist");
        if (!File.Exists(this.WorkerJankPath)) throw new Exception("Worker jank path does not exist");

        // Really shitty way to detect modified files
        var workerJankBytes = File.ReadAllBytes(this.WorkerJankPath);
        var workerJankHash = BitConverter.ToString(SHA256.Create().ComputeHash(workerJankBytes))
            .Replace("-", string.Empty)
            .ToLower();
        var workerJankContent = Encoding.UTF8.GetString(workerJankBytes);

        var startLine = $"// worker-jank start {workerJankHash}\n";
        const string endLine = "// worker-jank end\n";

        var workerScriptPaths = Directory.GetFiles(this.FrameworkDirectory, "dotnet.native.worker*.mjs");
        if (workerScriptPaths.Length != 1) throw new Exception("Couldn't determine unique dotnet.native.worker script");
        var workerScriptPath = workerScriptPaths.First();

        var workerScriptContent = File.ReadAllText(workerScriptPath);
        string? newWorkerScript = null;

        // Check if already modified
        if (workerScriptContent.Contains(endLine)) {
            // Check if hash is different
            if (!workerScriptContent.Contains(startLine)) {
                var index = workerScriptContent.IndexOf(endLine, StringComparison.InvariantCulture);
                var workerScriptOriginal = workerScriptContent.Substring(index + endLine.Length);
                newWorkerScript = startLine + workerJankContent + endLine + workerScriptOriginal;
            }
            // No changes, leave it as is
        } else {
            // Hasn't been modified, add script
            newWorkerScript = startLine + workerJankContent + endLine + workerScriptContent;
        }
        if (newWorkerScript != null) File.WriteAllText(workerScriptPath, newWorkerScript);

        return true;
    }
}
