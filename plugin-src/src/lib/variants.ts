/**
 * Local variant-class helper.
 *
 * Replaces `class-variance-authority` (Apache-2.0), which is GPL-compatible
 * in principle but was flagged for removal 2026-09-14 to keep the plugin's
 * own compiled code free of any question mark for WP.org review (CLAUDE.md
 * §5, WordPress.org Compliance — "GPL compatibility ... run `composer
 * licenses` to verify" extended here to the npm side of the Free bundle).
 *
 * This file implements ONLY the subset of cva's runtime behavior actually
 * used by atoms/Button.tsx, atoms/Badge.tsx and atoms/Card.tsx: a single
 * `base` class string, one or more named variant axes each mapping a
 * variant key to a class string, `defaultVariants` as the fallback applied
 * when a variant prop is omitted or `null`, and a trailing `className`
 * override appended last. There is no `compoundVariants` support — none of
 * the three atoms declare one.
 *
 * Output ordering matches cva's own join order exactly (verified against
 * node_modules/class-variance-authority/dist/index.mjs, cva 0.7.1):
 *   base, <variant classes in `variants` object key order>, className
 * joined with a single space, skipping falsy/undefined entries — the same
 * result clsx (cva's own join primitive) produces for these inputs, none of
 * which are ever `false`/`0`/arrays here.
 */

export type VariantSchema = Record<string, Record<string, string>>;

export interface VariantsConfig<V extends VariantSchema> {
  variants: V;
  defaultVariants?: { [K in keyof V]?: keyof V[K] | null };
}

type VariantSelection<V extends VariantSchema> = {
  [K in keyof V]?: keyof V[K] | null;
};

export type VariantsFn<V extends VariantSchema> = (
  props?: VariantSelection<V> & { className?: string }
) => string;

/**
 * `VariantProps<typeof someVariantsFn>` — the prop-shape a component
 * extends its own interface with, mirroring cva's own `VariantProps<T>`
 * (minus the `class`/`className` keys, which the component already
 * declares itself via `React.*HTMLAttributes`).
 */
export type VariantProps<T extends (...args: any) => unknown> = Omit<
  NonNullable<Parameters<T>[0]>,
  "className"
>;

export function variants<V extends VariantSchema>(
  base: string,
  config: VariantsConfig<V>
): VariantsFn<V> {
  const { variants: variantMap, defaultVariants } = config;
  const variantKeys = Object.keys(variantMap) as (keyof V)[];

  return (props) => {
    const parts: string[] = [base];

    for (const key of variantKeys) {
      const chosen = props?.[key] ?? defaultVariants?.[key];
      if (chosen === null || chosen === undefined) continue;
      const classForChoice = variantMap[key][chosen as string];
      if (classForChoice) parts.push(classForChoice);
    }

    if (props?.className) parts.push(props.className);

    return parts.filter(Boolean).join(" ");
  };
}
