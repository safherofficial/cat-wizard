#if UNITY_EDITOR
using System;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace CatWizard.Editor
{
    /// <summary>
    /// Creates and assigns a URP asset on first Editor import. This makes the
    /// repository self-configuring after Package Manager has resolved URP.
    /// </summary>
    [InitializeOnLoad]
    internal static class CatWizardProjectSetup
    {
        private const string SettingsFolder = "Assets/Settings";
        private const string PipelineAssetPath = SettingsFolder + "/CatWizardURP.asset";

        static CatWizardProjectSetup()
        {
            EditorApplication.delayCall += EnsurePipeline;
        }

        [MenuItem("Cat Wizard/Configure Universal Render Pipeline")]
        private static void ConfigureFromMenu()
        {
            EnsurePipeline();
        }

        private static void EnsurePipeline()
        {
            if (EditorApplication.isCompiling || EditorApplication.isUpdating)
                return;

            try
            {
                UniversalRenderPipelineAsset pipeline =
                    AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelineAssetPath);

                if (pipeline == null)
                {
                    if (!AssetDatabase.IsValidFolder(SettingsFolder))
                    {
                        if (!AssetDatabase.IsValidFolder("Assets/Settings"))
                            AssetDatabase.CreateFolder("Assets", "Settings");
                    }

                    // Unity's factory creates the renderer data and pipeline defaults.
                    pipeline = UniversalRenderPipelineAsset.Create();
                    if (pipeline == null)
                    {
                        Debug.LogError("[Cat Wizard] Unity could not create the URP asset. Create one via Assets > Create > Rendering > URP Asset (with Universal Renderer), then assign it in Project Settings > Graphics.");
                        return;
                    }

                    AssetDatabase.CreateAsset(pipeline, PipelineAssetPath);
                    AssetDatabase.SaveAssets();
                }

                bool changed = false;
                if (GraphicsSettings.defaultRenderPipeline != pipeline)
                {
                    GraphicsSettings.defaultRenderPipeline = pipeline;
                    changed = true;
                }

                int previousQuality = QualitySettings.GetQualityLevel();
                try
                {
                    for (int i = 0; i < QualitySettings.names.Length; i++)
                    {
                        QualitySettings.SetQualityLevel(i, false);
                        if (QualitySettings.renderPipeline != pipeline)
                        {
                            QualitySettings.renderPipeline = pipeline;
                            changed = true;
                        }
                    }
                }
                finally
                {
                    QualitySettings.SetQualityLevel(previousQuality, false);
                }

                if (changed)
                    EditorUtility.SetDirty(pipeline);

                AssetDatabase.SaveAssets();
            }
            catch (Exception exception)
            {
                Debug.LogError("[Cat Wizard] URP setup did not complete: " + exception);
            }
        }
    }
}
#endif
