/**
 * Split the license into addressable sections without changing its text.
 * @param {string} text
 * @returns {{ id: string, title: string, content: string }[]}
 */
export function getLicenseSections(text) {
  return text.split(/(?=^ {3}\d+\. )/m).map((content, index) => ({
    id: `license-section-${index}`,
    title: content.match(/^ {3}(\d+\. [^.]+\.)/m)?.[1] ?? "Apache License",
    content,
  }))
}
