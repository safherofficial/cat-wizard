using System.Collections;
using UnityEngine;
using CatWizard.Gameplay;
using CatWizard.Player;
using CatWizard.Spells;

namespace CatWizard.Enemies
{
    /// <summary>
    /// First combatant for Spell Lab: a hovering curse that drifts, chases the
    /// cat at close range, hurts on contact, and reacts differently to each spell.
    /// </summary>
    [RequireComponent(typeof(Rigidbody2D), typeof(CircleCollider2D), typeof(SpriteRenderer))]
    public sealed class CursedWisp : MonoBehaviour
    {
        private static readonly Color FrozenTint = new Color(0.55f, 0.88f, 1f, 1f);

        [SerializeField, Min(0.1f)] private float maximumHealth = 5f;
        [SerializeField, Min(0.1f)] private float moveSpeed = 1.55f;
        [SerializeField, Min(1f)] private float awarenessRadius = 13f;
        [SerializeField, Min(0.1f)] private float freezeDuration = 1.4f;

        private Rigidbody2D body;
        private SpriteRenderer spriteRenderer;
        private CatPlayerHealth target;
        private Vector2 homePosition;
        private Color baseColor;
        private float currentHealth;
        private float freezeRemaining;
        private float orbitPhase;
        private Coroutine flashRoutine;
        private bool defeated;

        public float CurrentHealth => currentHealth;
        public float MaxHealth => maximumHealth;

        public void Configure(CatPlayerHealth chaseTarget, float health, Color tint)
        {
            target = chaseTarget;
            maximumHealth = Mathf.Max(0.1f, health);
            currentHealth = maximumHealth;
            baseColor = tint;

            if (spriteRenderer == null)
                spriteRenderer = GetComponent<SpriteRenderer>();

            if (spriteRenderer != null)
                spriteRenderer.color = tint;

            homePosition = transform.position;
        }

        private void Awake()
        {
            body = GetComponent<Rigidbody2D>();
            spriteRenderer = GetComponent<SpriteRenderer>();
            baseColor = spriteRenderer.color;
            currentHealth = maximumHealth;
            homePosition = body.position;
            orbitPhase = Random.Range(0f, Mathf.PI * 2f);
        }

        private void FixedUpdate()
        {
            if (defeated || body == null)
                return;

            if (freezeRemaining > 0f)
            {
                freezeRemaining = Mathf.Max(0f, freezeRemaining - Time.fixedDeltaTime);
                if (freezeRemaining <= 0f && spriteRenderer != null)
                    spriteRenderer.color = baseColor;
                return;
            }

            if (target == null)
                target = FindFirstObjectByType<CatPlayerHealth>();

            Vector2 position = body.position;
            Vector2 destination;

            if (target != null && !target.IsRespawning &&
                ((Vector2)target.transform.position - position).sqrMagnitude <= awarenessRadius * awarenessRadius)
            {
                destination = target.transform.position;
            }
            else
            {
                float phase = Time.time * 0.7f + orbitPhase;
                destination = homePosition + new Vector2(
                    Mathf.Cos(phase) * 1.05f,
                    Mathf.Sin(phase * 1.25f) * 0.68f);
            }

            Vector2 delta = destination - position;
            if (delta.sqrMagnitude > 0.045f)
            {
                Vector2 direction = delta.normalized;
                body.MovePosition(position + direction * moveSpeed * Time.fixedDeltaTime);
                if (spriteRenderer != null && Mathf.Abs(direction.x) > 0.04f)
                    spriteRenderer.flipX = direction.x < 0f;
            }
        }

        public void ReceiveSpell(SpellType spell, Vector2 impactCenter)
        {
            if (defeated)
                return;

            float damage;
            float impulse;
            switch (spell)
            {
                case SpellType.Fireball:
                    damage = 1.75f;
                    impulse = 4.8f;
                    break;
                case SpellType.Thunderbolt:
                    damage = 2.5f;
                    impulse = 2.4f;
                    break;
                case SpellType.Frost:
                    damage = 0.7f;
                    impulse = 0f;
                    Freeze();
                    break;
                case SpellType.Gravity:
                    damage = 0.8f;
                    impulse = 1.2f;
                    break;
                case SpellType.Chaos:
                    damage = 3.25f;
                    impulse = 8f;
                    break;
                default:
                    return;
            }

            currentHealth -= damage;

            if (impulse > 0f && body != null)
            {
                Vector2 away = body.position - impactCenter;
                if (away.sqrMagnitude < 0.001f)
                    away = Random.insideUnitCircle;
                if (away.sqrMagnitude < 0.001f)
                    away = Vector2.up;

                body.AddForce(away.normalized * impulse, ForceMode2D.Impulse);
            }

            StartHitFlash();

            if (currentHealth <= 0f)
                Defeat();
        }

        public void ApplyGravityPull(Vector2 center, float force)
        {
            if (defeated || freezeRemaining > 0f || body == null)
                return;

            Vector2 towardCenter = center - body.position;
            if (towardCenter.sqrMagnitude > 0.025f)
                body.AddForce(towardCenter.normalized * force, ForceMode2D.Force);
        }

        private void Freeze()
        {
            freezeRemaining = Mathf.Max(freezeRemaining, freezeDuration);
            if (body != null)
                body.linearVelocity = Vector2.zero;

            if (spriteRenderer != null)
                spriteRenderer.color = FrozenTint;
        }

        private void StartHitFlash()
        {
            if (flashRoutine != null)
                StopCoroutine(flashRoutine);

            flashRoutine = StartCoroutine(HitFlash());
        }

        private IEnumerator HitFlash()
        {
            if (spriteRenderer != null)
                spriteRenderer.color = Color.white;

            yield return new WaitForSecondsRealtime(0.075f);

            if (spriteRenderer != null)
                spriteRenderer.color = freezeRemaining > 0f ? FrozenTint : baseColor;

            flashRoutine = null;
        }

        private void OnCollisionStay2D(Collision2D collision)
        {
            if (defeated)
                return;

            CatPlayerHealth playerHealth = collision.gameObject.GetComponentInParent<CatPlayerHealth>();
            if (playerHealth == null && collision.otherCollider != null)
                playerHealth = collision.otherCollider.GetComponentInParent<CatPlayerHealth>();

            if (playerHealth != null && body != null)
                playerHealth.TakeDamage(1, body.position, 4.2f);
        }

        private void Defeat()
        {
            if (defeated)
                return;

            defeated = true;
            if (flashRoutine != null)
                StopCoroutine(flashRoutine);

            Vector2 origin = body != null ? body.position : (Vector2)transform.position;
            for (int i = 0; i < 6; i++)
            {
                GameObject fragment = new GameObject("Wisp Fragment");
                fragment.transform.position = origin + Random.insideUnitCircle * 0.12f;
                float size = Random.Range(0.07f, 0.14f);
                fragment.transform.localScale = Vector3.one * size;

                SpriteRenderer fragmentRenderer = fragment.AddComponent<SpriteRenderer>();
                fragmentRenderer.sprite = SpellLabBootstrap.CircleSprite;
                fragmentRenderer.color = Color.Lerp(baseColor, Color.white, Random.Range(0.12f, 0.48f));
                fragmentRenderer.sortingOrder = 15;

                Rigidbody2D fragmentBody = fragment.AddComponent<Rigidbody2D>();
                fragmentBody.gravityScale = 0f;
                fragmentBody.linearDamping = 1.5f;
                fragmentBody.angularDamping = 1.5f;

                Vector2 burstDirection = Random.insideUnitCircle;
                if (burstDirection.sqrMagnitude < 0.001f)
                    burstDirection = Vector2.up;
                fragmentBody.AddForce(burstDirection.normalized * Random.Range(2f, 5f), ForceMode2D.Impulse);

                Destroy(fragment, 1.15f);
            }

            SpellLabBootstrap.RegisterEnemyDefeated();
            Destroy(gameObject);
        }
    }
}
