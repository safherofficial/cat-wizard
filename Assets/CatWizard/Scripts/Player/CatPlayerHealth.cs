using System;
using System.Collections;
using UnityEngine;

namespace CatWizard.Player
{
    /// <summary>
    /// Lightweight arena health loop: damage, knockback, brief invulnerability,
    /// and a safe return to the player's original spawn point.
    /// </summary>
    [RequireComponent(typeof(Rigidbody2D), typeof(SpriteRenderer))]
    public sealed class CatPlayerHealth : MonoBehaviour
    {
        [SerializeField, Min(1)] private int maximumHealth = 5;
        [SerializeField, Min(0.1f)] private float invulnerabilityDuration = 1.15f;
        [SerializeField, Min(0f)] private float knockbackStrength = 4.2f;
        [SerializeField, Min(0.1f)] private float respawnDelay = 1.15f;

        private Rigidbody2D body;
        private SpriteRenderer spriteRenderer;
        private RigidbodyConstraints2D originalConstraints;
        private Color originalColor;
        private Vector2 spawnPosition;
        private Coroutine damageFlashRoutine;
        private Coroutine respawnRoutine;
        private float invulnerabilityRemaining;
        private int currentHealth;
        private bool isRespawning;

        public int CurrentHealth => currentHealth;
        public int MaxHealth => maximumHealth;
        public bool IsRespawning => isRespawning;

        public event Action<int, int> HealthChanged;

        private void Awake()
        {
            body = GetComponent<Rigidbody2D>();
            spriteRenderer = GetComponent<SpriteRenderer>();
            originalConstraints = body.constraints;
            originalColor = spriteRenderer.color;
            spawnPosition = body.position;
            currentHealth = maximumHealth;
        }

        private void Update()
        {
            if (invulnerabilityRemaining > 0f)
                invulnerabilityRemaining = Mathf.Max(0f, invulnerabilityRemaining - Time.unscaledDeltaTime);
        }

        public bool TakeDamage(int amount, Vector2 source, float impulse)
        {
            if (amount <= 0 || isRespawning || invulnerabilityRemaining > 0f)
                return false;

            currentHealth = Mathf.Max(0, currentHealth - amount);
            invulnerabilityRemaining = invulnerabilityDuration;

            Vector2 away = body.position - source;
            if (away.sqrMagnitude < 0.001f)
                away = Random.insideUnitCircle;
            if (away.sqrMagnitude < 0.001f)
                away = Vector2.up;

            float force = impulse > 0f ? impulse : knockbackStrength;
            body.AddForce(away.normalized * force, ForceMode2D.Impulse);

            HealthChanged?.Invoke(currentHealth, maximumHealth);
            StartDamageFlash();

            if (currentHealth <= 0)
                respawnRoutine = StartCoroutine(RespawnAfterDelay());

            return true;
        }

        private void StartDamageFlash()
        {
            if (damageFlashRoutine != null)
                StopCoroutine(damageFlashRoutine);

            damageFlashRoutine = StartCoroutine(DamageFlash());
        }

        private IEnumerator DamageFlash()
        {
            float remaining = invulnerabilityDuration;
            bool bright = false;

            while (remaining > 0f && spriteRenderer != null)
            {
                bright = !bright;
                spriteRenderer.color = bright
                    ? Color.white
                    : new Color(originalColor.r, originalColor.g, originalColor.b, 0.42f);

                float step = Mathf.Min(0.09f, remaining);
                yield return new WaitForSecondsRealtime(step);
                remaining -= step;
            }

            if (spriteRenderer != null)
                spriteRenderer.color = originalColor;

            damageFlashRoutine = null;
        }

        private IEnumerator RespawnAfterDelay()
        {
            isRespawning = true;
            body.linearVelocity = Vector2.zero;
            body.angularVelocity = 0f;
            body.constraints = RigidbodyConstraints2D.FreezeAll;

            yield return new WaitForSecondsRealtime(respawnDelay);

            body.position = spawnPosition;
            transform.position = new Vector3(spawnPosition.x, spawnPosition.y, transform.position.z);
            body.linearVelocity = Vector2.zero;
            body.angularVelocity = 0f;
            body.constraints = originalConstraints;

            currentHealth = maximumHealth;
            invulnerabilityRemaining = invulnerabilityDuration;
            isRespawning = false;
            respawnRoutine = null;
            HealthChanged?.Invoke(currentHealth, maximumHealth);
            StartDamageFlash();
        }
    }
}
