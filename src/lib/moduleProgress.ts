// Shared learning-module completion logic so Learning Center and Progress agree
// on what "complete" means. The pass threshold lived as a magic 70 in two files.

export const PASS_THRESHOLD = 70

// Set of module_ids the user has passed (best quiz attempt ≥ threshold).
export function passedModuleSet(attempts: { module_id: string; percentage?: number }[] = []): Set<string> {
  return new Set(attempts.filter(a => (a.percentage ?? 0) >= PASS_THRESHOLD).map(a => a.module_id))
}

// A module is complete when every published lesson is done AND its quiz is passed.
export function isModuleComplete(lessonIds: string[], doneLessons: Set<string>, passedModules: Set<string>, moduleId: string): boolean {
  return lessonIds.length > 0 && lessonIds.every(id => doneLessons.has(id)) && passedModules.has(moduleId)
}
