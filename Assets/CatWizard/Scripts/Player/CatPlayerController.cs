using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.Controls;

namespace CatWizard.Player
{
    /// <summary>
    /// Top-down player movement. Desktop uses WASD / arrow keys; touch devices
    /// reserve the left side of the screen for a virtual thumb stick.
    /// </summary>
    [RequireComponent(typeof(Rigidbody2D))]
    public sealed class CatPlayerController : MonoBehaviour
    {
        [SerializeField, Min(0.1f)] private float moveSpeed = 5.2f;
        [SerializeField, Range(0.1f, 0.6f)] private float touchZoneFraction = 0.32f;
        [SerializeField, Min(30f)] private float touchStickRadius = 115f;

        private Rigidbody2D body;
        private SpriteRenderer spriteRenderer;
        private Vector2 keyboardMove;
        private Vector2 touchMove;
        private Vector2 aimDirection = Vector2.right;
        private int movementTouchId = -1;
        private Vector2 movementTouchOrigin;

        public Vector2 MoveInput { get; private set; }

        private void Awake()
        {
            body = GetComponent<Rigidbody2D>();
            spriteRenderer = GetComponent<SpriteRenderer>();
        }

        private void Update()
        {
            ReadKeyboardAndGamepad();
            ReadTouchMovement();

            MoveInput = Vector2.ClampMagnitude(keyboardMove + touchMove, 1f);
        }

        private void FixedUpdate()
        {
            if (body == null)
                return;

            body.MovePosition(body.position + MoveInput * moveSpeed * Time.fixedDeltaTime);
        }

        public void SetAimDirection(Vector2 direction)
        {
            if (direction.sqrMagnitude < 0.001f)
                return;

            aimDirection = direction.normalized;
            if (spriteRenderer != null)
                spriteRenderer.flipX = aimDirection.x < -0.02f;
        }

        public Vector2 GetWorldPosition()
        {
            return body != null ? body.position : (Vector2)transform.position;
        }

        private void ReadKeyboardAndGamepad()
        {
            keyboardMove = Vector2.zero;
            if (Keyboard.current != null)
            {
                if (Keyboard.current.aKey.isPressed || Keyboard.current.leftArrowKey.isPressed)
                    keyboardMove.x -= 1f;
                if (Keyboard.current.dKey.isPressed || Keyboard.current.rightArrowKey.isPressed)
                    keyboardMove.x += 1f;
                if (Keyboard.current.sKey.isPressed || Keyboard.current.downArrowKey.isPressed)
                    keyboardMove.y -= 1f;
                if (Keyboard.current.wKey.isPressed || Keyboard.current.upArrowKey.isPressed)
                    keyboardMove.y += 1f;
            }

            if (Gamepad.current != null)
                keyboardMove += Gamepad.current.leftStick.ReadValue();

            keyboardMove = Vector2.ClampMagnitude(keyboardMove, 1f);
        }

        private void ReadTouchMovement()
        {
            touchMove = Vector2.zero;
            if (Touchscreen.current == null)
            {
                movementTouchId = -1;
                return;
            }

            var touches = Touchscreen.current.touches;

            if (movementTouchId < 0)
            {
                for (int i = 0; i < touches.Count; i++)
                {
                    TouchControl touch = touches[i];
                    if (!touch.press.wasPressedThisFrame)
                        continue;

                    Vector2 start = touch.position.ReadValue();
                    if (start.x > Screen.width * touchZoneFraction)
                        continue;

                    movementTouchId = touch.touchId.ReadValue();
                    movementTouchOrigin = start;
                    break;
                }
            }

            if (movementTouchId < 0)
                return;

            for (int i = 0; i < touches.Count; i++)
            {
                TouchControl touch = touches[i];
                if (touch.touchId.ReadValue() != movementTouchId)
                    continue;

                if (touch.press.wasReleasedThisFrame ||
                    touch.phase.ReadValue() == UnityEngine.InputSystem.TouchPhase.Canceled)
                {
                    movementTouchId = -1;
                    return;
                }

                if (touch.press.isPressed)
                {
                    Vector2 delta = touch.position.ReadValue() - movementTouchOrigin;
                    float radius = Mathf.Max(30f, touchStickRadius);
                    touchMove = Vector2.ClampMagnitude(delta / radius, 1f);
                }

                return;
            }

            movementTouchId = -1;
        }
    }
}
