using UnityEngine;
using UnityEngine.Rendering.Universal;
using UnityEngine.Rendering;
using CatWizard.Enemies;
using CatWizard.Gameplay;
using CatWizard.Player;
using CatWizard.Spells;
using CatWizard.UI;
using CatWizard.World;

namespace CatWizard.Gameplay
{
    /// <summary>
    /// Creates the first self-contained test arena at runtime. Keeping the
    /// scene bootstrap procedural makes the initial scene easy to import and
    /// iterate while the visual asset set is still being built.
    /// </summary>
    public sealed class SpellLabBootstrap : MonoBehaviour
    {
        private const float ArenaHalfWidth = 13f;
        private const float ArenaHalfHeight = 7.5f;

        public static Sprite SquareSprite { get; private set; }
        public static Sprite CircleSprite { get; private set; }
        public static string LastSpellName { get; set; }
        public static float LastSpellConfidence { get; set; }
        public static int EnemiesDefeated { get; private set; }
        public static int TotalEnemies { get; private set; }

        public static void RegisterEnemyDefeated()
        {
            EnemiesDefeated = Mathf.Min(EnemiesDefeated + 1, TotalEnemies);
        }

        private static Sprite crateSprite;
        private static Sprite barrelSprite;
        private static Sprite vaseSprite;
        private static Sprite arenaFloorSprite;
        private static Sprite stoneSprite;

        private void Start()
        {
            Application.targetFrameRate = 60;
            if (Application.isMobilePlatform)
                Screen.orientation = ScreenOrientation.LandscapeLeft;

            EnemiesDefeated = 0;
            TotalEnemies = 0;
            LastSpellName = string.Empty;
            LastSpellConfidence = 0f;

            CreateRuntimeSprites();
            CreateLighting();
            Camera camera = CreateCamera();
            BuildArena();

            CatPlayerController player = BuildPlayer(camera);
            CatPlayerHealth playerHealth = player.GetComponent<CatPlayerHealth>();
            BuildEnemies(playerHealth);
            BuildSpellPipeline(camera, player);
            BuildHud(playerHealth);
        }

        private static void CreateRuntimeSprites()
        {
            if (SquareSprite != null && arenaFloorSprite != null && stoneSprite != null)
                return;

            SquareSprite = CreateSolidSprite(Color.white, 32);
            CircleSprite = CreateCircleSprite(64);
            crateSprite = CreateCrateSprite(64);
            barrelSprite = CreateBarrelSprite(64);
            vaseSprite = CreateVaseSprite(64);
            arenaFloorSprite = CreateArenaFloorSprite(26, 15, 32);
            stoneSprite = CreateStoneSprite(64);
        }

        private void CreateLighting()
        {
            // The 2D Renderer uses a global light to illuminate Sprite-Lit materials.
            GameObject globalObject = new GameObject("Global Ambient 2D Light");
            Light2D globalLight = globalObject.AddComponent<Light2D>();
            globalLight.lightType = Light2D.LightType.Global;
            globalLight.color = new Color(0.74f, 0.81f, 0.95f, 1f);
            globalLight.intensity = 0.72f;

            CreatePointLight(
                "Warm Training Hall Light",
                new Vector2(-6.3f, 2.2f),
                new Color(1f, 0.62f, 0.34f, 1f),
                1.15f,
                5.8f);

            CreatePointLight(
                "Arcane Blue Light",
                new Vector2(6.5f, 1.8f),
                new Color(0.34f, 0.72f, 1f, 1f),
                1.1f,
                5.6f);

            CreatePointLight(
                "Violet Ruin Light",
                new Vector2(0f, -4.4f),
                new Color(0.68f, 0.42f, 1f, 1f),
                0.7f,
                4.2f);
        }

        private static void CreatePointLight(
            string lightName,
            Vector2 position,
            Color tint,
            float intensity,
            float radius)
        {
            GameObject lightObject = new GameObject(lightName);
            lightObject.transform.position = new Vector3(position.x, position.y, -0.5f);

            Light2D light = lightObject.AddComponent<Light2D>();
            light.lightType = Light2D.LightType.Point;
            light.color = tint;
            light.intensity = intensity;
            light.pointLightInnerRadius = radius * 0.28f;
            light.pointLightOuterRadius = radius;
            light.falloffIntensity = 0.65f;
            light.shadowsEnabled = false;
        }

        private Camera CreateCamera()
        {
            Camera camera = Camera.main;
            if (camera == null)
            {
                GameObject cameraObject = new GameObject("Main Camera");
                cameraObject.tag = "MainCamera";
                camera = cameraObject.AddComponent<Camera>();
                cameraObject.AddComponent<AudioListener>();
            }

            camera.orthographic = true;
            camera.orthographicSize = 6.2f;
            camera.transform.position = new Vector3(0f, 0f, -10f);
            camera.backgroundColor = new Color(0.035f, 0.047f, 0.075f, 1f);
            camera.clearFlags = CameraClearFlags.SolidColor;

            CameraFollow2D follow = camera.GetComponent<CameraFollow2D>();
            if (follow == null)
                follow = camera.gameObject.AddComponent<CameraFollow2D>();

            float aspect = Mathf.Max(1f, (float)Screen.width / Mathf.Max(1, Screen.height));
            follow.Configure(null, new Vector2(
                Mathf.Max(0f, ArenaHalfWidth - camera.orthographicSize * aspect - 0.8f),
                Mathf.Max(0f, ArenaHalfHeight - camera.orthographicSize - 0.8f)));

            return camera;
        }

        private void BuildArena()
        {
            GameObject floor = new GameObject("Arena Floor");
            floor.transform.position = new Vector3(0f, 0f, 1f);
            floor.transform.localScale = Vector3.one;
            SpriteRenderer floorRenderer = floor.AddComponent<SpriteRenderer>();
            floorRenderer.sprite = arenaFloorSprite;
            floorRenderer.color = Color.white;
            floorRenderer.sortingOrder = -100;

            CreateWall("North Wall", new Vector2(0f, ArenaHalfHeight), new Vector2(ArenaHalfWidth * 2f, 0.45f));
            CreateWall("South Wall", new Vector2(0f, -ArenaHalfHeight), new Vector2(ArenaHalfWidth * 2f, 0.45f));
            CreateWall("West Wall", new Vector2(-ArenaHalfWidth, 0f), new Vector2(0.45f, ArenaHalfHeight * 2f));
            CreateWall("East Wall", new Vector2(ArenaHalfWidth, 0f), new Vector2(0.45f, ArenaHalfHeight * 2f));

            // Wooden training props, stone blocks, and fragile ceramic targets.
            CreateProp("Crate A", new Vector2(-7.2f, 3.8f), new Vector2(1.05f, 1.05f), crateSprite,
                new Color(0.93f, 0.65f, 0.36f), 2f, false);
            CreateProp("Crate B", new Vector2(-5.3f, 2.9f), new Vector2(1.1f, 1.1f), crateSprite,
                new Color(0.81f, 0.48f, 0.25f), 2f, false);
            CreateProp("Crate C", new Vector2(-2.8f, 4.1f), new Vector2(1f, 1f), crateSprite,
                new Color(0.98f, 0.72f, 0.42f), 2f, false);
            CreateProp("Crate D", new Vector2(0.2f, 3.8f), new Vector2(1.1f, 1.1f), crateSprite,
                new Color(0.84f, 0.56f, 0.32f), 2f, false);
            CreateProp("Crate E", new Vector2(3.2f, 3.6f), new Vector2(1.2f, 1.05f), crateSprite,
                new Color(0.91f, 0.62f, 0.34f), 2f, false);
            CreateProp("Crate F", new Vector2(6.7f, 3.3f), new Vector2(1.1f, 1.1f), crateSprite,
                new Color(0.79f, 0.46f, 0.26f), 2f, false);

            CreateProp("Barrel A", new Vector2(-8.1f, -0.2f), new Vector2(0.92f, 0.92f), barrelSprite,
                new Color(0.75f, 0.36f, 0.2f), 2.7f, true);
            CreateProp("Barrel B", new Vector2(-4.1f, -1.6f), new Vector2(0.9f, 0.9f), barrelSprite,
                new Color(0.85f, 0.48f, 0.25f), 2.7f, true);
            CreateProp("Barrel C", new Vector2(5.3f, -1.5f), new Vector2(0.95f, 0.95f), barrelSprite,
                new Color(0.69f, 0.32f, 0.2f), 2.7f, true);
            CreateProp("Barrel D", new Vector2(8.1f, 0.8f), new Vector2(0.9f, 0.9f), barrelSprite,
                new Color(0.88f, 0.49f, 0.26f), 2.7f, true);

            CreateProp("Porcelain Vase A", new Vector2(-1.6f, -0.6f), new Vector2(0.78f, 0.9f), vaseSprite,
                new Color(0.44f, 0.82f, 0.89f), 1.1f, false);
            CreateProp("Porcelain Vase B", new Vector2(1.8f, 0.2f), new Vector2(0.78f, 0.9f), vaseSprite,
                new Color(0.74f, 0.62f, 0.92f), 1.1f, false);
            CreateProp("Porcelain Vase C", new Vector2(7.7f, -3.2f), new Vector2(0.78f, 0.9f), vaseSprite,
                new Color(0.88f, 0.65f, 0.83f), 1.1f, false);

            CreateProp("Stone Block A", new Vector2(-7.1f, -4.1f), new Vector2(1.2f, 1.2f), stoneSprite,
                new Color(0.46f, 0.54f, 0.64f), 4.5f, false);
            CreateProp("Stone Block B", new Vector2(7f, 4.8f), new Vector2(1.2f, 1.2f), stoneSprite,
                new Color(0.5f, 0.57f, 0.68f), 4.5f, false);

            // A breakable masonry barricade makes the environment itself a target.
            for (int i = 0; i < 6; i++)
            {
                float x = -3.75f + i * 1.5f;
                CreateProp(
                    "Breakable Ruin Wall " + (i + 1),
                    new Vector2(x, 1.85f),
                    new Vector2(1.42f, 0.82f),
                    stoneSprite,
                    new Color(0.47f, 0.56f, 0.68f),
                    4.2f,
                    false);
            }

            // Short pillars add destructible cover with different silhouettes.
            CreateProp("Ruin Pillar A", new Vector2(-9.7f, 4.25f), new Vector2(0.9f, 1.7f), stoneSprite,
                new Color(0.52f, 0.59f, 0.68f), 4.5f, false);
            CreateProp("Ruin Pillar B", new Vector2(9.7f, -4.4f), new Vector2(0.9f, 1.7f), stoneSprite,
                new Color(0.46f, 0.53f, 0.64f), 4.5f, false);
        }

        private void CreateGridLines()
        {
            Material material = CreateLineMaterial();
            for (int x = -12; x <= 12; x += 2)
                CreateGridLine(new Vector2(x, -7.2f), new Vector2(x, 7.2f), material);

            for (int y = -7; y <= 7; y += 2)
                CreateGridLine(new Vector2(-12.7f, y), new Vector2(12.7f, y), material);
        }

        private static void CreateGridLine(Vector2 start, Vector2 end, Material material)
        {
            GameObject lineObject = new GameObject("Floor Grid");
            LineRenderer line = lineObject.AddComponent<LineRenderer>();
            line.useWorldSpace = true;
            line.positionCount = 2;
            line.SetPosition(0, new Vector3(start.x, start.y, 0.9f));
            line.SetPosition(1, new Vector3(end.x, end.y, 0.9f));
            line.startWidth = 0.012f;
            line.endWidth = 0.012f;
            line.material = material;
            line.startColor = new Color(0.3f, 0.42f, 0.53f, 0.22f);
            line.endColor = line.startColor;
            line.sortingOrder = -90;
        }

        private static void CreateWall(string name, Vector2 position, Vector2 size)
        {
            GameObject wall = new GameObject(name);
            wall.transform.position = position;
            wall.transform.localScale = new Vector3(size.x, size.y, 1f);

            SpriteRenderer renderer = wall.AddComponent<SpriteRenderer>();
            renderer.sprite = SquareSprite;
            renderer.color = new Color(0.17f, 0.21f, 0.29f, 1f);
            renderer.sortingOrder = 0;

            BoxCollider2D collider = wall.AddComponent<BoxCollider2D>();
            collider.size = Vector2.one;
        }

        private static void CreateProp(
            string name,
            Vector2 position,
            Vector2 size,
            Sprite sprite,
            Color tint,
            float health,
            bool circular)
        {
            GameObject prop = new GameObject(name);
            prop.transform.position = position;
            prop.transform.localScale = new Vector3(size.x, size.y, 1f);

            GameObject shadow = new GameObject("Ground Shadow");
            shadow.transform.SetParent(prop.transform, false);
            shadow.transform.localPosition = new Vector3(0f, -0.16f, 0.08f);
            shadow.transform.localScale = new Vector3(1.2f, 0.62f, 1f);
            SpriteRenderer shadowRenderer = shadow.AddComponent<SpriteRenderer>();
            shadowRenderer.sprite = CircleSprite;
            shadowRenderer.color = new Color(0.015f, 0.02f, 0.035f, 0.42f);
            shadowRenderer.sortingOrder = 3;

            SpriteRenderer renderer = prop.AddComponent<SpriteRenderer>();
            renderer.sprite = sprite;
            renderer.color = tint;
            renderer.sortingOrder = 4;

            if (circular)
                prop.AddComponent<CircleCollider2D>();
            else
                prop.AddComponent<BoxCollider2D>();

            Rigidbody2D body = prop.AddComponent<Rigidbody2D>();
            body.gravityScale = 0f;
            body.mass = Mathf.Max(0.4f, size.x * size.y);
            body.linearDamping = 1.25f;
            body.angularDamping = 1.8f;
            body.interpolation = RigidbodyInterpolation2D.Interpolate;
            body.collisionDetectionMode = CollisionDetectionMode2D.Continuous;
            body.constraints = RigidbodyConstraints2D.None;

            DestructibleProp destructible = prop.AddComponent<DestructibleProp>();
            destructible.Configure(health, tint);
        }

        private CatPlayerController BuildPlayer(Camera camera)
        {
            GameObject cat = new GameObject("The Distinguished Cat");
            cat.transform.position = new Vector3(0f, -3.4f, -0.15f);
            cat.transform.localScale = Vector3.one * 0.55f;

            SpriteRenderer renderer = cat.AddComponent<SpriteRenderer>();
            renderer.sprite = Resources.Load<Sprite>("CatWizard/cat_wizard_game");
            renderer.sortingOrder = 12;

            GameObject catShadow = new GameObject("Cat Ground Shadow");
            catShadow.transform.SetParent(cat.transform, false);
            catShadow.transform.localPosition = new Vector3(0f, -0.29f, 0.08f);
            catShadow.transform.localScale = new Vector3(1.85f, 0.64f, 1f);
            SpriteRenderer catShadowRenderer = catShadow.AddComponent<SpriteRenderer>();
            catShadowRenderer.sprite = CircleSprite;
            catShadowRenderer.color = new Color(0.012f, 0.018f, 0.03f, 0.48f);
            catShadowRenderer.sortingOrder = 11;

            if (renderer.sprite == null)
                Debug.LogError("Cat Wizard sprite not found at Resources/CatWizard/cat_wizard_game.png", cat);

            CircleCollider2D collider = cat.AddComponent<CircleCollider2D>();
            collider.radius = 0.47f;
            collider.offset = new Vector2(0f, -0.04f);

            Rigidbody2D body = cat.AddComponent<Rigidbody2D>();
            body.gravityScale = 0f;
            body.mass = 3f;
            body.linearDamping = 6f;
            body.angularDamping = 8f;
            body.interpolation = RigidbodyInterpolation2D.Interpolate;
            body.constraints = RigidbodyConstraints2D.FreezeRotation;

            CatPlayerController controller = cat.AddComponent<CatPlayerController>();
            cat.AddComponent<CatPlayerHealth>();

            CameraFollow2D follow = camera.GetComponent<CameraFollow2D>();
            if (follow != null)
                follow.SetTarget(cat.transform);

            return controller;
        }

        private void BuildEnemies(CatPlayerHealth playerHealth)
        {
            CreateWisp(
                "Cursed Wisp - Ember",
                new Vector2(-10.2f, -1.7f),
                new Color(0.9f, 0.31f, 0.2f),
                playerHealth);

            CreateWisp(
                "Cursed Wisp - Aether",
                new Vector2(0f, 5.85f),
                new Color(0.36f, 0.7f, 1f),
                playerHealth);

            CreateWisp(
                "Cursed Wisp - Gloom",
                new Vector2(10.2f, 1.65f),
                new Color(0.68f, 0.39f, 0.94f),
                playerHealth);
        }

        private void CreateWisp(
            string wispName,
            Vector2 position,
            Color tint,
            CatPlayerHealth playerHealth)
        {
            GameObject wisp = new GameObject(wispName);
            wisp.transform.position = position;

            GameObject aura = new GameObject("Wisp Aura");
            aura.transform.SetParent(wisp.transform, false);
            aura.transform.localScale = Vector3.one * 1.38f;
            SpriteRenderer auraRenderer = aura.AddComponent<SpriteRenderer>();
            auraRenderer.sprite = CircleSprite;
            auraRenderer.color = new Color(tint.r, tint.g, tint.b, 0.2f);
            auraRenderer.sortingOrder = 8;

            SpriteRenderer bodyRenderer = wisp.AddComponent<SpriteRenderer>();
            bodyRenderer.sprite = CircleSprite;
            bodyRenderer.color = tint;
            bodyRenderer.sortingOrder = 9;

            GameObject core = new GameObject("Wisp Core");
            core.transform.SetParent(wisp.transform, false);
            core.transform.localScale = Vector3.one * 0.76f;
            SpriteRenderer coreRenderer = core.AddComponent<SpriteRenderer>();
            coreRenderer.sprite = CircleSprite;
            coreRenderer.color = Color.Lerp(tint, Color.white, 0.3f);
            coreRenderer.sortingOrder = 10;

            AddWispDetail(wisp.transform, "Left Eye", new Vector2(-0.15f, 0.055f), 0.09f,
                new Color(0.075f, 0.055f, 0.12f), 11);
            AddWispDetail(wisp.transform, "Right Eye", new Vector2(0.15f, 0.055f), 0.09f,
                new Color(0.075f, 0.055f, 0.12f), 11);
            AddWispDetail(wisp.transform, "Core Glint", new Vector2(-0.19f, 0.2f), 0.1f,
                new Color(1f, 1f, 1f, 0.82f), 11);

            CircleCollider2D collider = wisp.AddComponent<CircleCollider2D>();
            collider.radius = 0.43f;

            Rigidbody2D body = wisp.AddComponent<Rigidbody2D>();
            body.gravityScale = 0f;
            body.mass = 0.85f;
            body.linearDamping = 2.8f;
            body.angularDamping = 5f;
            body.interpolation = RigidbodyInterpolation2D.Interpolate;
            body.collisionDetectionMode = CollisionDetectionMode2D.Continuous;
            body.constraints = RigidbodyConstraints2D.FreezeRotation;

            CursedWisp controller = wisp.AddComponent<CursedWisp>();
            controller.Configure(playerHealth, 5f, tint);
            TotalEnemies++;
        }

        private static void AddWispDetail(
            Transform parent,
            string detailName,
            Vector2 localPosition,
            float scale,
            Color tint,
            int sortingOrder)
        {
            GameObject detail = new GameObject(detailName);
            detail.transform.SetParent(parent, false);
            detail.transform.localPosition = localPosition;
            detail.transform.localScale = Vector3.one * scale;

            SpriteRenderer renderer = detail.AddComponent<SpriteRenderer>();
            renderer.sprite = CircleSprite;
            renderer.color = tint;
            renderer.sortingOrder = sortingOrder;
        }

        private void BuildSpellPipeline(Camera camera, CatPlayerController player)
        {
            SpellGestureInput input = gameObject.AddComponent<SpellGestureInput>();
            SpellGestureRecognizer recognizer = gameObject.AddComponent<SpellGestureRecognizer>();
            SpellTimeDilation dilation = gameObject.AddComponent<SpellTimeDilation>();
            SpellDrawingController drawing = gameObject.AddComponent<SpellDrawingController>();

            GameObject trailObject = new GameObject("Live Spell Tracing");
            LineRenderer line = trailObject.AddComponent<LineRenderer>();
            line.material = CreateLineMaterial();
            line.startColor = new Color(0.45f, 0.94f, 1f, 1f);
            line.endColor = new Color(0.9f, 0.46f, 1f, 0.95f);
            line.startWidth = 0.07f;
            line.endWidth = 0.035f;
            line.sortingOrder = 100;
            SpellStrokeRenderer strokeRenderer = trailObject.AddComponent<SpellStrokeRenderer>();

            drawing.Configure(input, recognizer, dilation, strokeRenderer);

            SpellCombatController combat = gameObject.AddComponent<SpellCombatController>();
            combat.Configure(drawing, player, camera);

            gameObject.AddComponent<SpellGestureDebugProbe>();
        }

        private void BuildHud(CatPlayerHealth playerHealth)
        {
            SpellLabHud hud = gameObject.AddComponent<SpellLabHud>();
            hud.Configure(GetComponent<SpellGestureInput>(), playerHealth);
        }

        private static Material CreateLineMaterial()
        {
            RenderPipelineAsset activePipeline = GraphicsSettings.currentRenderPipeline;
            if (activePipeline != null && activePipeline.defaultLineMaterial != null)
                return new Material(activePipeline.defaultLineMaterial);

            Shader shader = Shader.Find("Universal Render Pipeline/2D/Sprite-Unlit-Default");
            if (shader == null)
                shader = Shader.Find("Universal Render Pipeline/Unlit");
            if (shader == null)
                shader = Shader.Find("Sprites/Default");

            if (shader == null)
            {
                Debug.LogError("[Cat Wizard] No compatible unlit shader was found for spell trails and arena lines.");
                return new Material(Shader.Find("Hidden/InternalErrorShader"));
            }

            return new Material(shader);
        }

        private static Sprite CreateSolidSprite(Color color, int size)
        {
            Texture2D texture = new Texture2D(size, size, TextureFormat.RGBA32, false);
            texture.filterMode = FilterMode.Bilinear;
            Color32[] pixels = new Color32[size * size];
            Color32 value = color;
            for (int i = 0; i < pixels.Length; i++)
                pixels[i] = value;

            texture.SetPixels32(pixels);
            texture.Apply();
            return Sprite.Create(texture, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
        }

        private static Sprite CreateArenaFloorSprite(int columns, int rows, int tileSize)
        {
            int width = columns * tileSize;
            int height = rows * tileSize;
            Color32[] pixels = new Color32[width * height];

            Color32 grout = new Color32(17, 25, 38, 255);
            Color32[] tileTones =
            {
                new Color32(43, 55, 71, 255),
                new Color32(47, 59, 75, 255),
                new Color32(40, 52, 68, 255),
                new Color32(50, 61, 76, 255),
                new Color32(44, 56, 73, 255)
            };

            for (int tileY = 0; tileY < rows; tileY++)
            {
                for (int tileX = 0; tileX < columns; tileX++)
                {
                    int toneIndex = Mathf.Abs((tileX * 17 + tileY * 31 + tileX * tileY * 3) % tileTones.Length);
                    Color32 tone = tileTones[toneIndex];

                    for (int py = 0; py < tileSize; py++)
                    {
                        for (int px = 0; px < tileSize; px++)
                        {
                            int x = tileX * tileSize + px;
                            int y = tileY * tileSize + py;
                            Color32 color = grout;

                            if (px >= 2 && py >= 2)
                            {
                                int noise = ((x * 19 + y * 23 + tileX * 11 + tileY * 7) % 9) - 4;
                                color = AdjustColor(tone, noise);

                                if (px < 5 || py < 5)
                                    color = AdjustColor(color, 7);
                                else if (px >= tileSize - 4 || py >= tileSize - 4)
                                    color = AdjustColor(color, -8);

                                if ((px * 7 + py * 13 + tileX * 5 + tileY * 3) % 97 == 0)
                                    color = AdjustColor(color, 13);
                            }

                            pixels[y * width + x] = color;
                        }
                    }
                }
            }

            Color32 bronze = new Color32(119, 91, 61, 255);
            Color32 paleBronze = new Color32(155, 125, 86, 255);
            DrawRectOutline(pixels, width, height, 7, 7, width - 8, height - 8, bronze, 2);
            DrawRectOutline(pixels, width, height, 12, 12, width - 13, height - 13,
                new Color32(78, 91, 105, 255), 1);

            int centerX = width / 2;
            int centerY = height / 2;
            DrawCircle(pixels, width, height, centerX, centerY, 112, paleBronze, 2);
            DrawCircle(pixels, width, height, centerX, centerY, 104,
                new Color32(83, 106, 126, 255), 1);
            DrawCircle(pixels, width, height, centerX, centerY, 54, bronze, 2);
            DrawCircle(pixels, width, height, centerX, centerY, 47,
                new Color32(83, 106, 126, 255), 1);
            DrawCircle(pixels, width, height, centerX, centerY, 13, paleBronze, 2);

            for (int i = 0; i < 12; i++)
            {
                float angle = i * Mathf.PI * 2f / 12f;
                int outerX = centerX + Mathf.RoundToInt(Mathf.Cos(angle) * 112f);
                int outerY = centerY + Mathf.RoundToInt(Mathf.Sin(angle) * 112f);
                int innerX = centerX + Mathf.RoundToInt(Mathf.Cos(angle) * 90f);
                int innerY = centerY + Mathf.RoundToInt(Mathf.Sin(angle) * 90f);
                DrawLine(pixels, width, height, innerX, innerY, outerX, outerY, bronze, 2);

                int runeX = centerX + Mathf.RoundToInt(Mathf.Cos(angle) * 128f);
                int runeY = centerY + Mathf.RoundToInt(Mathf.Sin(angle) * 128f);
                DrawCircle(pixels, width, height, runeX, runeY, 4, paleBronze, 1);
            }

            int[,] corners =
            {
                { 42, 42 },
                { width - 43, 42 },
                { 42, height - 43 },
                { width - 43, height - 43 }
            };
            for (int i = 0; i < corners.GetLength(0); i++)
            {
                int cx = corners[i, 0];
                int cy = corners[i, 1];
                DrawCircle(pixels, width, height, cx, cy, 17, bronze, 2);
                DrawCircle(pixels, width, height, cx, cy, 7, paleBronze, 1);
                DrawLine(pixels, width, height, cx - 11, cy, cx + 11, cy, bronze, 1);
                DrawLine(pixels, width, height, cx, cy - 11, cx, cy + 11, bronze, 1);
            }

            Texture2D texture = new Texture2D(width, height, TextureFormat.RGBA32, false);
            texture.name = "CatWizard Arena Stone Floor";
            texture.filterMode = FilterMode.Point;
            texture.wrapMode = TextureWrapMode.Clamp;
            texture.SetPixels32(pixels);
            texture.Apply(false, true);
            return Sprite.Create(texture, new Rect(0, 0, width, height),
                new Vector2(0.5f, 0.5f), tileSize);
        }

        private static Sprite CreateStoneSprite(int size)
        {
            Color32[] pixels = new Color32[size * size];
            Color32 border = new Color32(25, 36, 49, 255);
            Color32[] stoneTones =
            {
                new Color32(111, 124, 139, 255),
                new Color32(121, 132, 145, 255),
                new Color32(103, 116, 132, 255)
            };

            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    bool bevel = x < 4 || y < 4 || x >= size - 4 || y >= size - 4;
                    int variation = ((x * 17 + y * 29 + x * y) % 13) - 6;
                    Color32 color = bevel ? border :
                        AdjustColor(stoneTones[(x / 8 + y / 11) % stoneTones.Length], variation);

                    if (x == 5 || y == 5)
                        color = AdjustColor(color, 18);
                    if (x == size - 6 || y == size - 6)
                        color = AdjustColor(color, -18);

                    pixels[y * size + x] = color;
                }
            }

            Color32 crack = new Color32(60, 72, 87, 255);
            DrawLine(pixels, size, size, 15, 17, 25, 28, crack, 2);
            DrawLine(pixels, size, size, 25, 28, 20, 38, crack, 1);
            DrawLine(pixels, size, size, 42, 39, 49, 47, crack, 1);
            DrawCircle(pixels, size, size, 13, 47, 2, new Color32(161, 171, 183, 255), 1);
            DrawCircle(pixels, size, size, 48, 14, 2, new Color32(161, 171, 183, 255), 1);

            Texture2D texture = new Texture2D(size, size, TextureFormat.RGBA32, false);
            texture.name = "CatWizard Carved Stone";
            texture.filterMode = FilterMode.Point;
            texture.SetPixels32(pixels);
            texture.Apply(false, true);
            return Sprite.Create(texture, new Rect(0, 0, size, size),
                new Vector2(0.5f, 0.5f), size);
        }

        private static Color32 AdjustColor(Color32 source, int amount)
        {
            return new Color32(
                (byte)Mathf.Clamp(source.r + amount, 0, 255),
                (byte)Mathf.Clamp(source.g + amount, 0, 255),
                (byte)Mathf.Clamp(source.b + amount, 0, 255),
                source.a);
        }

        private static void DrawRectOutline(
            Color32[] pixels, int width, int height,
            int left, int bottom, int right, int top,
            Color32 color, int thickness)
        {
            for (int i = 0; i < thickness; i++)
            {
                DrawLine(pixels, width, height, left + i, bottom + i, right - i, bottom + i, color, 1);
                DrawLine(pixels, width, height, left + i, top - i, right - i, top - i, color, 1);
                DrawLine(pixels, width, height, left + i, bottom + i, left + i, top - i, color, 1);
                DrawLine(pixels, width, height, right - i, bottom + i, right - i, top - i, color, 1);
            }
        }

        private static void DrawCircle(
            Color32[] pixels, int width, int height,
            int centerX, int centerY, int radius, Color32 color, int thickness)
        {
            int inner = Mathf.Max(0, radius - thickness);
            int outerSquared = radius * radius;
            int innerSquared = inner * inner;

            int minX = Mathf.Max(0, centerX - radius - 1);
            int maxX = Mathf.Min(width - 1, centerX + radius + 1);
            int minY = Mathf.Max(0, centerY - radius - 1);
            int maxY = Mathf.Min(height - 1, centerY + radius + 1);

            for (int y = minY; y <= maxY; y++)
            {
                for (int x = minX; x <= maxX; x++)
                {
                    int dx = x - centerX;
                    int dy = y - centerY;
                    int distanceSquared = dx * dx + dy * dy;
                    if (distanceSquared <= outerSquared && distanceSquared >= innerSquared)
                        pixels[y * width + x] = color;
                }
            }
        }

        private static void DrawLine(
            Color32[] pixels, int width, int height,
            int x0, int y0, int x1, int y1,
            Color32 color, int thickness)
        {
            int dx = Mathf.Abs(x1 - x0);
            int sx = x0 < x1 ? 1 : -1;
            int dy = -Mathf.Abs(y1 - y0);
            int sy = y0 < y1 ? 1 : -1;
            int error = dx + dy;
            int radius = Mathf.Max(0, thickness - 1) / 2;

            while (true)
            {
                for (int oy = -radius; oy <= radius; oy++)
                {
                    for (int ox = -radius; ox <= radius; ox++)
                    {
                        int x = x0 + ox;
                        int y = y0 + oy;
                        if (x >= 0 && x < width && y >= 0 && y < height)
                            pixels[y * width + x] = color;
                    }
                }

                if (x0 == x1 && y0 == y1)
                    break;

                int twiceError = 2 * error;
                if (twiceError >= dy)
                {
                    error += dy;
                    x0 += sx;
                }
                if (twiceError <= dx)
                {
                    error += dx;
                    y0 += sy;
                }
            }
        }

        private static Sprite CreateCircleSprite(int size)
        {
            Texture2D texture = new Texture2D(size, size, TextureFormat.RGBA32, false);
            texture.filterMode = FilterMode.Bilinear;
            Color32[] pixels = new Color32[size * size];
            float center = (size - 1) * 0.5f;
            float radius = size * 0.47f;

            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    float distance = Vector2.Distance(new Vector2(x, y), new Vector2(center, center));
                    float alpha = Mathf.Clamp01(radius + 1f - distance);
                    pixels[y * size + x] = new Color(1f, 1f, 1f, alpha);
                }
            }

            texture.SetPixels32(pixels);
            texture.Apply();
            return Sprite.Create(texture, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
        }

        private static Sprite CreateCrateSprite(int size)
        {
            Texture2D texture = new Texture2D(size, size, TextureFormat.RGBA32, false);
            Color32[] pixels = new Color32[size * size];
            Color32 border = new Color32(75, 43, 29, 255);
            Color32 plank = new Color32(205, 137, 77, 255);
            Color32 plankDark = new Color32(164, 99, 52, 255);
            Color32 highlight = new Color32(238, 183, 118, 255);

            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    bool edge = x < 5 || y < 5 || x >= size - 5 || y >= size - 5;
                    int boardIndex = Mathf.Clamp((x - 5) / 18, 0, 2);
                    bool seam = boardIndex > 0 && x % 18 < 2;
                    int grain = ((x * 7 + y * 11 + boardIndex * 13) % 17) - 8;
                    Color32 boardTone = AdjustColor(boardIndex == 1 ? plankDark : plank, grain);
                    Color32 c = edge ? border : (seam ? border : boardTone);

                    if (!edge && (y == 8 || y == size - 9))
                        c = AdjustColor(c, 15);

                    pixels[y * size + x] = c;
                }
            }

            DrawLine(pixels, size, size, 10, 10, size - 10, size - 10,
                new Color32(111, 67, 39, 255), 4);
            DrawLine(pixels, size, size, size - 10, 10, 10, size - 10,
                new Color32(111, 67, 39, 255), 4);
            DrawCircle(pixels, size, size, 10, 10, 2, new Color32(48, 34, 28, 255), 2);
            DrawCircle(pixels, size, size, size - 10, 10, 2, new Color32(48, 34, 28, 255), 2);
            DrawCircle(pixels, size, size, 10, size - 10, 2, new Color32(48, 34, 28, 255), 2);
            DrawCircle(pixels, size, size, size - 10, size - 10, 2, new Color32(48, 34, 28, 255), 2);

            texture.filterMode = FilterMode.Point;
            texture.SetPixels32(pixels);
            texture.Apply();
            return Sprite.Create(texture, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
        }

        private static Sprite CreateBarrelSprite(int size)
        {
            Texture2D texture = new Texture2D(size, size, TextureFormat.RGBA32, false);
            Color32[] pixels = new Color32[size * size];
            float center = (size - 1) * 0.5f;
            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    float dx = (x - center) / (size * 0.46f);
                    float dy = (y - center) / (size * 0.46f);
                    float d = dx * dx + dy * dy;
                    Color32 c = d > 1f
                        ? new Color32(0, 0, 0, 0)
                        : new Color32(110, 53, 34, 255);

                    if (d <= 0.82f && d >= 0.63f)
                        c = new Color32(67, 55, 53, 255);
                    else if (d < 0.63f)
                        c = new Color32(190, 105, 55, 255);

                    if (y > size * 0.43f && y < size * 0.49f ||
                        y > size * 0.68f && y < size * 0.74f)
                        if (d < 0.9f)
                            c = new Color32(83, 58, 49, 255);

                    pixels[y * size + x] = c;
                }
            }

            texture.SetPixels32(pixels);
            texture.Apply();
            return Sprite.Create(texture, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
        }

        private static Sprite CreateVaseSprite(int size)
        {
            Texture2D texture = new Texture2D(size, size, TextureFormat.RGBA32, false);
            Color32[] pixels = new Color32[size * size];
            for (int y = 0; y < size; y++)
            {
                for (int x = 0; x < size; x++)
                {
                    float normalizedY = y / (float)(size - 1);
                    float normalizedX = Mathf.Abs((x - (size - 1) * 0.5f) / (size * 0.5f));
                    float width = Mathf.Lerp(0.19f, 0.38f, Mathf.Sin(normalizedY * Mathf.PI));
                    bool inside = normalizedX < width && normalizedY > 0.08f && normalizedY < 0.93f;
                    Color32 c = inside
                        ? new Color32(232, 241, 247, 255)
                        : new Color32(0, 0, 0, 0);

                    if (inside && normalizedX < width * 0.38f)
                        c = new Color32(255, 255, 255, 255);

                    if (normalizedY > 0.84f && normalizedX < 0.21f)
                        c = new Color32(77, 50, 81, 255);

                    pixels[y * size + x] = c;
                }
            }

            texture.SetPixels32(pixels);
            texture.Apply();
            return Sprite.Create(texture, new Rect(0, 0, size, size), new Vector2(0.5f, 0.5f), size);
        }

        private void OnDestroy()
        {
            DestroySprite(SquareSprite);
            DestroySprite(CircleSprite);
            DestroySprite(crateSprite);
            DestroySprite(barrelSprite);
            DestroySprite(vaseSprite);
            DestroySprite(arenaFloorSprite);
            DestroySprite(stoneSprite);
            SquareSprite = null;
            CircleSprite = null;
            crateSprite = null;
            barrelSprite = null;
            vaseSprite = null;
            arenaFloorSprite = null;
            stoneSprite = null;
        }

        private static void DestroySprite(Sprite sprite)
        {
            if (sprite == null)
                return;

            Texture2D texture = sprite.texture;
            Destroy(sprite);
            if (texture != null)
                Destroy(texture);
        }
    }
}
