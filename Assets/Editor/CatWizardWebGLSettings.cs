#if UNITY_EDITOR
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

namespace CatWizard.Editor
{
    /// <summary>
    /// Applies WebGL settings immediately before a browser build.
    /// Gzip plus Unity's decompression fallback keeps the build compatible
    /// with static hosts that do not send Content-Encoding headers.
    /// </summary>
    internal sealed class CatWizardWebGLSettings : IPreprocessBuildWithReport
    {
        private const string TemplateFolder = "Assets/WebGLTemplates/CatWizardWeb";
        private const string TemplateAssetPath = TemplateFolder + "/index.html";

        public int callbackOrder => -1000;

        public void OnPreprocessBuild(BuildReport report)
        {
            if (report.summary.platform != BuildTarget.WebGL)
                return;

            if (!File.Exists(TemplateAssetPath))
            {
                throw new BuildFailedException(
                    "[Cat Wizard] The custom WebGL template is missing: " + TemplateAssetPath);
            }

            PlayerSettings.WebGL.template = "PROJECT:CatWizardWeb";
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Gzip;
            PlayerSettings.WebGL.decompressionFallback = true;
            PlayerSettings.WebGL.dataCaching = true;
            PlayerSettings.WebGL.showDiagnostics = false;

            AssetDatabase.SaveAssets();
            Debug.Log(
                "[Cat Wizard] WebGL settings applied: CatWizardWeb template, Gzip with decompression fallback, and data caching.");
        }
    }
}
#endif
