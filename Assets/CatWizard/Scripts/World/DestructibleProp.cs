using System.Collections;
using UnityEngine;
using CatWizard.Spells;

namespace CatWizard.World
{
    [RequireComponent(typeof(Rigidbody2D), typeof(Collider2D), typeof(SpriteRenderer))]
    public sealed class DestructibleProp : MonoBehaviour
    {
        [SerializeField, Min(0.1f)] private float hitPoints = 2f;

        private float currentHitPoints;
        private Rigidbody2D body;
        private Collider2D propCollider;
        private SpriteRenderer spriteRenderer;
        private RigidbodyConstraints2D originalConstraints;
        private Color originalColor;
        private Coroutine freezeRoutine;
        private bool destroyed;

        public void Configure(float health, Color tint)
        {
            hitPoints = Mathf.Max(0.1f, health);
            currentHitPoints = hitPoints;

            if (spriteRenderer == null)
                spriteRenderer = GetComponent<SpriteRenderer>();

            if (spriteRenderer != null)
            {
                spriteRenderer.color = tint;
                originalColor = tint;
            }
        }

        private void Awake()
        {
            body = GetComponent<Rigidbody2D>();
            propCollider = GetComponent<Collider2D>();
            spriteRenderer = GetComponent<SpriteRenderer>();

            if (body != null)
                originalConstraints = body.constraints;

            if (spriteRenderer != null)
            {
                originalColor = spriteRenderer.color;
            }

            currentHitPoints = hitPoints;
        }

        public void ReceiveSpell(SpellType spell, Vector2 impactCenter)
        {
            if (destroyed)
                return;

            Vector2 away = (body.position - impactCenter);
            if (away.sqrMagnitude < 0.0001f)
                away = Random.insideUnitCircle;
            away.Normalize();

            float damage = 0f;
            float impulse = 0f;

            switch (spell)
            {
                case SpellType.Fireball:
                    damage = 1.25f;
                    impulse = 11f;
                    break;
                case SpellType.Thunderbolt:
                    damage = 1.1f;
                    impulse = 7f;
                    break;
                case SpellType.Frost:
                    damage = 0.25f;
                    impulse = 1.5f;
                    Freeze(1.35f);
                    break;
                case SpellType.Gravity:
                    damage = 0f;
                    impulse = 10f;
                    away = -away;
                    break;
                case SpellType.Chaos:
                    damage = 2.4f;
                    impulse = 17f;
                    break;
            }

            if (body != null && !body.constraints.HasFlag(RigidbodyConstraints2D.FreezeAll))
                {
                    body.AddForce(away * impulse, ForceMode2D.Impulse);
                    if (impulse > 0f)
                        body.AddTorque(Random.Range(-1f, 1f) * impulse * 2.2f, ForceMode2D.Impulse);
                }

            currentHitPoints -= damage;
            if (currentHitPoints <= 0f)
                Shatter(away);
        }

        public void ApplyGravityPull(Vector2 center, float force)
        {
            if (destroyed || body == null || body.constraints.HasFlag(RigidbodyConstraints2D.FreezeAll))
                return;

            Vector2 direction = center - body.position;
            if (direction.sqrMagnitude > 0.001f)
                body.AddForce(direction.normalized * force, ForceMode2D.Force);
        }

        private void Freeze(float duration)
        {
            if (body == null)
                return;

            if (freezeRoutine != null)
                StopCoroutine(freezeRoutine);

            originalConstraints = body.constraints;
            body.linearVelocity = Vector2.zero;
            body.constraints = RigidbodyConstraints2D.FreezeAll;

            if (spriteRenderer != null)
                spriteRenderer.color = new Color(0.55f, 0.88f, 1f, 1f);

            freezeRoutine = StartCoroutine(ThawAfter(duration));
        }

        private IEnumerator ThawAfter(float duration)
        {
            yield return new WaitForSeconds(duration);

            if (body != null)
                body.constraints = originalConstraints;

            if (spriteRenderer != null)
                spriteRenderer.color = originalColor;

            freezeRoutine = null;
        }

        private void Shatter(Vector2 impulseDirection)
        {
            if (destroyed)
                return;

            destroyed = true;

            if (freezeRoutine != null)
                StopCoroutine(freezeRoutine);

            Vector3 origin = transform.position;
            Color shardColor = spriteRenderer != null ? spriteRenderer.color : Color.white;
            int shardCount = Random.Range(5, 9);

            for (int i = 0; i < shardCount; i++)
            {
                GameObject shard = new GameObject("Prop Shard");
                shard.transform.position = origin + (Vector3)(Random.insideUnitCircle * 0.18f);
                float size = Random.Range(0.09f, 0.2f);
                shard.transform.localScale = new Vector3(size, size, 1f);

                var renderer = shard.AddComponent<SpriteRenderer>();
                renderer.sprite = SpellLabBootstrap.SquareSprite;
                renderer.color = Color.Lerp(shardColor, Color.white, Random.Range(0f, 0.18f));
                renderer.sortingOrder = 8;

                var shardBody = shard.AddComponent<Rigidbody2D>();
                shardBody.gravityScale = 0f;
                shardBody.linearDamping = 1.1f;
                shardBody.angularDamping = 1.4f;
                shardBody.AddForce(
                    (Random.insideUnitCircle.normalized + impulseDirection * 0.35f) *
                    Random.Range(2.5f, 6.5f),
                    ForceMode2D.Impulse);
                shardBody.AddTorque(Random.Range(-90f, 90f));

                var shardCollider = shard.AddComponent<BoxCollider2D>();
                shardCollider.size = Vector2.one;
                Destroy(shard, Random.Range(1.2f, 2.1f));
            }

            if (propCollider != null)
                propCollider.enabled = false;

            if (body != null)
                body.simulated = false;

            Destroy(gameObject);
        }
    }
}
