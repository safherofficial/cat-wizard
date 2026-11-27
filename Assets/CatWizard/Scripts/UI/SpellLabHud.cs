using UnityEngine;
using CatWizard.Spells;

namespace CatWizard.UI
{
    /// <summary>
    /// Lightweight runtime HUD so the first scene needs no serialized Canvas setup.
    /// </summary>
    public sealed class SpellLabHud : MonoBehaviour
    {
        private SpellGestureInput gestureInput;
        private GUIStyle titleStyle;
        private GUIStyle bodyStyle;
        private GUIStyle legendStyle;
        private GUIStyle panelStyle;
        private Texture2D panelTexture;
        private int cachedWidth;

        public void Configure(SpellGestureInput input)
        {
            gestureInput = input;
        }

        private void OnGUI()
        {
            EnsureStyles();

            float scale = Mathf.Clamp(Screen.width / 1280f, 0.72f, 1.25f);
            float margin = 20f * scale;
            float headerHeight = 86f * scale;

            GUI.color = new Color(0.035f, 0.055f, 0.09f, 0.88f);
            GUI.Box(new Rect(margin, margin, Screen.width - margin * 2f, headerHeight), GUIContent.none, panelStyle);
            GUI.color = Color.white;

            GUI.Label(
                new Rect(margin + 18f * scale, margin + 10f * scale, 420f * scale, 30f * scale),
                "CAT WIZARD  /  SPELL LAB",
                titleStyle);

            string controls = Application.isMobilePlatform
                ? "LEFT THUMB: MOVE     RIGHT SIDE: DRAW A GLYPH"
                : "WASD / ARROWS: MOVE     HOLD LEFT MOUSE + DRAW A GLYPH";

            GUI.Label(
                new Rect(margin + 18f * scale, margin + 45f * scale, Screen.width * 0.62f, 24f * scale),
                controls,
                bodyStyle);

            bool drawing = gestureInput != null && gestureInput.IsDrawing;
            string timeState = drawing ? "TIME DILATION  •  0.15x" : "DRAW TO BEND TIME";
            GUI.Label(
                new Rect(Screen.width - 310f * scale - margin, margin + 24f * scale, 290f * scale, 28f * scale),
                timeState,
                drawing ? titleStyle : bodyStyle);

            float footerHeight = 58f * scale;
            Rect footer = new Rect(margin, Screen.height - footerHeight - margin, Screen.width - margin * 2f, footerHeight);
            GUI.color = new Color(0.035f, 0.055f, 0.09f, 0.88f);
            GUI.Box(footer, GUIContent.none, panelStyle);
            GUI.color = Color.white;

            string legend = "○  FIREBALL     ⚡  THUNDERBOLT     △  FROST     ↻  GRAVITY     ☆  CHAOS";
            GUI.Label(
                new Rect(footer.x + 18f * scale, footer.y + 13f * scale, footer.width - 36f * scale, footer.height - 18f * scale),
                legend,
                legendStyle);

            if (!string.IsNullOrEmpty(SpellLabBootstrap.LastSpellName))
            {
                string status = SpellLabBootstrap.LastSpellName.ToUpperInvariant() +
                    "  CAST  •  " + (SpellLabBootstrap.LastSpellConfidence * 100f).ToString("0") + "% MATCH";
                GUI.Label(
                    new Rect(margin + 18f * scale, margin + headerHeight + 8f * scale, 420f * scale, 26f * scale),
                    status,
                    bodyStyle);
            }
        }

        private void EnsureStyles()
        {
            if (titleStyle != null && cachedWidth == Screen.width)
                return;

            cachedWidth = Screen.width;
            float scale = Mathf.Clamp(Screen.width / 1280f, 0.72f, 1.25f);

            titleStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = Mathf.RoundToInt(19f * scale),
                fontStyle = FontStyle.Bold,
                alignment = TextAnchor.MiddleLeft
            };
            titleStyle.normal.textColor = new Color(1f, 0.82f, 0.46f, 1f);

            bodyStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = Mathf.RoundToInt(13f * scale),
                alignment = TextAnchor.MiddleLeft
            };
            bodyStyle.normal.textColor = new Color(0.82f, 0.88f, 0.96f, 1f);

            legendStyle = new GUIStyle(bodyStyle)
            {
                fontSize = Mathf.RoundToInt(13f * scale),
                fontStyle = FontStyle.Bold
            };
            legendStyle.normal.textColor = new Color(0.92f, 0.95f, 1f, 1f);

            if (panelTexture == null)
            {
                panelTexture = new Texture2D(1, 1, TextureFormat.RGBA32, false);
                panelTexture.SetPixel(0, 0, Color.white);
                panelTexture.Apply();
            }

            panelStyle = new GUIStyle(GUI.skin.box)
            {
                normal = { background = panelTexture },
                border = new RectOffset(0, 0, 0, 0)
            };
        }

        private void OnDestroy()
        {
            if (panelTexture != null)
                Destroy(panelTexture);
        }
    }
}
