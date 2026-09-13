/**
 * Le rappel de la convention de nommage des fichiers audio.
 */

/**
 * L'encart d'aide au nommage, avec un exemple tiré de l'oeuvre ouverte.
 *
 * @param example - Nom de fichier d'exemple, construit sur l'oeuvre ouverte.
 * @param movementRequired - Vrai quand l'oeuvre compte plusieurs mouvements.
 * @returns L'encart rendu.
 */
export function AudioNamingGuide({
  example,
  movementRequired,
}: {
  example: string;
  movementRequired: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">Comment nommer les fichiers</p>
      <p className="mt-1">
        mouvement-pupitre-type.extension, séparés par des tirets simples.
        Exemple : <span className="font-medium text-foreground">{example}</span>
      </p>
      <p className="mt-1">
        {movementRequired
          ? "Le mouvement est obligatoire, cette œuvre en compte plusieurs."
          : "Le mouvement est facultatif, cette œuvre n'en a qu'un."}{" "}
        Tutti et accompagnement s&apos;écrivent sans pupitre. Les abréviations
        passent aussi, sop, s, ms, ct, ainsi que predom, mix, apercu.
      </p>
    </div>
  );
}
