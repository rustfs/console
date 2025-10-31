/**
 * Convert the given array to a tree structure.
 * @param arr - Original array where each element contains id and pid properties, pid represents parent id.
 * @returns Returns the converted tree structure array.
 */
export function arrayToTree(arr: any[]) {
  // Initialize result array
  const res: any = []
  // Use Map to store array elements, with id as key and element itself as value
  const map = new Map()

  // Traverse array and store each element in Map with id as key
  arr.forEach(item => {
    map.set(item.id, item)
  })

  // Traverse array again to organize elements into tree structure based on pid
  arr.forEach(item => {
    // Get parent element of current element
    const parent = item.pid && map.get(item.pid)
    // If parent exists
    if (parent) {
      // If parent already has children, append current element to children array
      if (parent?.children) parent.children.push(item)
      // If parent has no children, create children array and add current element as first child
      else parent.children = [item]
    }
    // If no parent, add current element directly to result array
    else {
      res.push(item)
    }
  })
  // Return organized tree structure array
  return res
}
