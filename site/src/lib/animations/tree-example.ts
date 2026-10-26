export interface TreeNode {
  id: string;
  left?: TreeNode;
  right?: TreeNode;
}

/**
 * 文章里的示例二叉树：
 *
 *        a
 *      /   \
 *     b     c
 *    / \   / \
 *   d   e f   g
 */
export const EXAMPLE_TREE: TreeNode = {
  id: 'a',
  left: {
    id: 'b',
    left: { id: 'd' },
    right: { id: 'e' },
  },
  right: {
    id: 'c',
    left: { id: 'f' },
    right: { id: 'g' },
  },
};

export const TREE_NODES = new Map<string, TreeNode>();
export const TREE_LEVELS = new Map<string, number>();

(function collect(node: TreeNode, level: number) {
  TREE_NODES.set(node.id, node);
  TREE_LEVELS.set(node.id, level);
  if (node.left) collect(node.left, level + 1);
  if (node.right) collect(node.right, level + 1);
})(EXAMPLE_TREE, 1);
