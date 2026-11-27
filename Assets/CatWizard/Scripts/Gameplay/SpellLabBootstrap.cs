using UnityEngine;
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

        private static Sprite crateSprite;
        private static Sprite barrelSprite;
        private static Sprite vaseSprite;

        private void Start()
        {
            Application.targetFrameRate = 60;
            if (Application.isMobilePlatform)
                Screen.orientation = ScreenOrientation.LandscapeLeft;

            CreateRuntimeSprites();
            Camera camera = CreateCamera();
            BuildArena();

            CatPlayerController player = BuildPlayer(camera);
            BuildSpellPipeline(camera, player);
            BuildHud();

            LastSpellName = string.Empty;
            LastSpellConfidence = 0f;
        }

        private static void CreateRuntimeSprites()
        {
            if (SquareSprite != null)
                return;

            SquareSprite = CreateSolidSprite(Color.white, 32);
            CircleSprite = CreateCircleSprite(64);
            crateSprite = CreateCrateSprite(64);
            barrelSprite = CreateBarrelSprite(64);
            vaseSprite = CreateVaseSprite(64);
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
            floor.transform.localScale = new Vector3(ArenaHalfWidth * 2f, ArenaHalfHeight * 2f, 1f);
            SpriteRenderer floorRenderer = floor.AddComponent<SpriteRenderer>();
            floorRenderer.sprite = SquareSprite;
            floorRenderer.color = new Color(0.105f, 0.13f, 0.18f, 1f);
            floorRenderer.sortingOrder = -100;

            CreateGridLines();

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

            CreateProp("Stone Block A", new Vector2(-7.1f, -4.1f), new Vector2(1.2f, 1.2f), crateSprite,
                new Color(0.46f, 0.54f, 0.64f), 4.5f, false);
            CreateProp("Stone Block B", new Vector2(7f, 4.8f), new Vector2(1.2f, 1.2f), crateSprite,
                new Color(0.5f, 0.57f, 0.68f), 4.5f, false);
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
            body.drag = 1.25f;
            body.angularDrag = 1.8f;
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

            if (renderer.sprite == null)
                Debug.LogError("Cat Wizard sprite not found at Resources/CatWizard/cat_wizard_game.png", cat);

            CircleCollider2D collider = cat.AddComponent<CircleCollider2D>();
            collider.radius = 0.47f;
            collider.offset = new Vector2(0f, -0.04f);

            Rigidbody2D body = cat.AddComponent<Rigidbody2D>();
            body.gravityScale = 0f;
            body.mass = 3f;
            body.drag = 6f;
            body.angularDrag = 8f;
            body.interpolation = RigidbodyInterpolation2D.Interpolate;
            body.constraints = RigidbodyConstraints2D.FreezeRotation;

            CatPlayerController controller = cat.AddComponent<CatPlayerController>();

            CameraFollow2D follow = camera.GetComponent<CameraFollow2D>();
            if (follow != null)
                follow.Configure(cat.transform, new Vector2(2.5f, 1.1f));

            return controller;
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

        private void BuildHud()
        {
            SpellLabHud hud = gameObject.AddComponent<SpellLabHud>();
            hud.Configure(GetComponent<SpellGestureInput>());
        }

        private static Material CreateLineMaterial()
        {
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
                    bool seam = y > size / 2 - 2 && y < size / 2 + 2;
                    Color32 c = edge ? border : (seam ? plankDark : plank);
                    if (!edge && !seam && x > 9 && x < size - 10 && y > 9 && y < size - 10 &&
                        ((x + y) % 29 < 2))
                        c = highlight;
                    pixels[y * size + x] = c;
                }
            }

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
            SquareSprite = null;
            CircleSprite = null;
            crateSprite = null;
            barrelSprite = null;
            vaseSprite = null;
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
