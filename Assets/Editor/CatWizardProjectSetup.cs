#if UNITY_EDITOR
using System;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

namespace CatWizard.Editor
{
    /// <summary>
    /// Creates and assigns a URP asset with the built-in 2D Renderer on first
    /// Editor import. This makes the repository self-configuring after URP resolves.
    /// </summary>
    [InitializeOnLoad]
    internal static class CatWizardProjectSetup
    {
        private const string SettingsFolder = "Assets/Settings";
        private const string PipelineAssetPath = SettingsFolder + "/CatWizardURP.asset";
        private const string RendererAssetPath = SettingsFolder + "/CatWizard2DRenderer.asset";
        private const string BuiltinRendererTempPath = "Assets/UniversalRenderer.asset";

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
                EnsureSettingsFolder();

                UniversalRenderPipelineAsset pipeline =
                    AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(PipelineAssetPath);

                if (pipeline == null)
                {
                    RenderPipelineAsset activePipeline = GraphicsSettings.defaultRenderPipeline;
                    if (activePipeline != null && !(activePipeline is UniversalRenderPipelineAsset))
                    {
                        Debug.LogWarning(
                            "[Cat Wizard] A different render pipeline is already assigned. It has been preserved; URP setup was skipped.");
                        return;
                    }

                    pipeline = activePipeline as UniversalRenderPipelineAsset;
                }

                if (pipeline == null)
                {
                    ScriptableRendererData rendererData =
                        AssetDatabase.LoadAssetAtPath<ScriptableRendererData>(RendererAssetPath);

                    if (rendererData == null)
                        rendererData = Create2DRendererData();

                    pipeline = UniversalRenderPipelineAsset.Create(rendererData);
                    if (pipeline == null)
                    {
                        Debug.LogError("[Cat Wizard] Unity could not create the URP asset.");
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
                        RenderPipelineAsset qualityPipeline = QualitySettings.renderPipeline;
                        if (qualityPipeline != null && qualityPipeline != pipeline)
                        {
                            Debug.LogWarning(
                                "[Cat Wizard] Preserving a different render pipeline assigned to quality level '" +
                                QualitySettings.names[i] + "'.");
                            continue;
                        }

                        if (qualityPipeline != pipeline)
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
                Debug.Log("[Cat Wizard] URP configured with the 2D Renderer.");
            }
            catch (Exception exception)
            {
                Debug.LogError("[Cat Wizard] URP setup did not complete: " + exception);
            }
        }

        private static void EnsureSettingsFolder()
        {
            if (!AssetDatabase.IsValidFolder(SettingsFolder))
                AssetDatabase.CreateFolder("Assets", "Settings");
        }

        private static ScriptableRendererData Create2DRendererData()
        {
            // LoadBuiltinRendererData initializes Unity's own 2D renderer resources.
            // In the Editor, URP currently creates this asset at a fixed temporary path.
            if (AssetDatabase.LoadMainAssetAtPath(BuiltinRendererTempPath) != null)
                throw new InvalidOperationException(
                    "Assets/UniversalRenderer.asset already exists. Move or inspect that asset before automatic 2D renderer setup.");

            UniversalRenderPipelineAsset factory = UniversalRenderPipelineAsset.Create();
            if (factory == null)
                throw new InvalidOperationException("Unable to create a temporary URP factory asset.");

            ScriptableRendererData rendererData = factory.LoadBuiltinRendererData(RendererType._2DRenderer);
            if (rendererData == null)
            {
                UnityEngine.Object.DestroyImmediate(factory);
                throw new InvalidOperationException("URP did not return its built-in 2D renderer data.");
            }

            string generatedPath = AssetDatabase.GetAssetPath(rendererData);
            if (string.IsNullOrEmpty(generatedPath))
            {
                AssetDatabase.CreateAsset(rendererData, RendererAssetPath);
            }
            else if (generatedPath != RendererAssetPath)
            {
                string moveError = AssetDatabase.MoveAsset(generatedPath, RendererAssetPath);
                if (!string.IsNullOrEmpty(moveError))
                {
                    UnityEngine.Object.DestroyImmediate(factory);
                    throw new InvalidOperationException("Could not move the URP 2D renderer asset: " + moveError);
                }
            }

            rendererData.name = "CatWizard2DRenderer";
            EditorUtility.SetDirty(rendererData);
            AssetDatabase.SaveAssets();

            UnityEngine.Object.DestroyImmediate(factory);
            return AssetDatabase.LoadAssetAtPath<ScriptableRendererData>(RendererAssetPath);
        }
    }
}
#endif
