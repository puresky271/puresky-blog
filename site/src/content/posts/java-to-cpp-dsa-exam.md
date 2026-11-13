---
title: '要怎么在数据结构期末从 Java 切到 C++'
description: '你平时在力扣写 Java 写嗨了，但期末考卷上却是 C++ 的 class Solution，但没有关系，你要换的只是表达方式，这篇文章就将教你怎么功利性地快速完成转换。'
pubDate: 2026-11-13
category: technology
tags: ['学习', '链表', '二叉树', '栈', '队列']
subcategory: 'data-structures'
---

让我们假设你要填的代码躺在一个方法类里面：

```cpp
class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        // 题目的空位就在这儿
    }
};
```

数据结构期末考给出的代码形式基本上就是力扣的样子：题目已经把 `ListNode` 和 `TreeNode` 的定义给好了，你只需要往 `class Solution` 里填函数体，不用自己写 `main`，不用自己建表建树，也不用管内存什么时候释放。

你真正需要跨过去的只有一件事：**把 Java 的写法换成 C++ 的写法**，算法骨架本身一个字都不用改。

## class Solution 的骨架

```cpp
class Solution {
public:                          // 1. 力扣的成员函数必须放在 public: 下面
    int f(TreeNode* root) {       // 2. 参数和返回值都要写指针类型
        return 0;                 // 3. 每条语句末尾要有分号
    }
};                                 // 4. class 的定义结束也要有一个分号
```

Java 里 `class Solution {` 后面不写 `public` 是因为成员函数默认就是包内可见，力扣的调用方够得着。而 C++ 的 `class` 默认是 `private`，不写 `public:` 的话函数根本出不去，力扣那边会报找不到方法。`};` 那个分号更是老生常谈，**漏了会出现一堆指向下一行的诡异报错。**

如果平时写自己的项目，可能还会看到 `struct Solution` 或者把函数写成全局的，考试和力扣统一用上面这个形状就行。

一般而言：题目给的 `ListNode` 和 `TreeNode` 是下面这样，**不需要你重新定义**：

```cpp
struct ListNode {
    int val;
    ListNode* next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode* next) : val(x), next(next) {}
};

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode* left, TreeNode* right)
        : val(x), left(left), right(right) {}
};
```

## 1. 参数传的是拷贝还是同一个对象

这是 Java 转 C++ 最容易出事故的地方，而且事故现场往往不报错，只是答案莫名其妙不对。

在 Java 里，除了八种基本类型，**所有对象变量都是引用**。你把一个 `List<Integer> path` 传给函数，函数里 `path.add(1)`，外面那个 `path` 也会多出一个元素，因为两边指的是同一个堆上的对象。

C++ 反过来：**参数默认是拷贝**。C++ 的 `vector` 是真正的对象，按值传参意味着整个数组被复制一份，函数里怎么改都和外面无关。想把“共享”这件事写出来得在参数类型后面加一个 `&`。

```cpp
void modify(vector<int>& v) {      // 引用：v 就是外面那个 vector
    v.push_back(1);                // 外面的 v 真的会变长
}

void tryModify(vector<int> v) {    // 拷贝：v 是外面那个 vector 的副本
    v.push_back(1);                // 外面的 v 一个元素都没多
}

int sum(const vector<int>& v) {    // 只读不改，加 const 更清楚
    int s = 0;
    for (int x : v) s += x;
    return s;
}
```

同一个道理也适用于基本类型。Java 里传一个 `int` 进去改不动外面，只能靠返回值或者包一层数组。C++ 直接写 `int&`，函数里改的就是调用者的那个变量：

:::tabs
```java
// Java：想让 helper 把答案写回来，只能靠成员变量或者数组包装
class Solution {
    private int ans = 0;

    public int countNodes(TreeNode root) {
        dfs(root);
        return ans;
    }

    private void dfs(TreeNode node) {
        if (node == null) return;
        ans++;
        dfs(node.left);
        dfs(node.right);
    }
}
```

```cpp
// C++：直接传引用，不必再挂一个成员变量
class Solution {
public:
    int countNodes(TreeNode* root) {
        int ans = 0;
        dfs(root, ans);
        return ans;
    }

private:
    void dfs(TreeNode* node, int& ans) {
        if (node == nullptr) return;
        ans++;
        dfs(node->left, ans);
        dfs(node->right, ans);
    }
};
```
:::

`path` 必须按引用传，否则每层递归都在改自己的副本，回到上一层就白改了。而把 `path` 存进结果集时，C++ 的 `push_back` 会自动拷贝一份，Java 那边却必须显式写 `new ArrayList<>(path)`。

## 2. 星号和箭头

**Java 里 `ListNode` 变量天生就是一个引用**，`.next` 就够了。C++ 里 `ListNode*` 才是指针，取成员得用 `->`。

```cpp
ListNode* p = head;
int x = p->val;        // 等价于 (*p).val
p = p->next;           // 往后走一格
bool empty = (p == nullptr);   // 判空，考试里也可以写 !p
```

三条对照关系，记住就够用：

| 用途 | Java | C++ |
| :--- | :--- | :--- |
| 声明节点变量 | `ListNode p` | `ListNode* p` |
| 访问成员 | `p.val` `p.next` | `p->val` `p->next` |
| 空指针 | `null` | `nullptr`（写 `NULL` 也对） |

二叉树里字段名可能不一样。力扣用 `left` 和 `right`，教材常用 `lchild` 和 `rchild`，写之前先看一眼题目给的 `TreeNode` 定义，别看错就行。

## 3. 容器对照表

| 用途 | Java | C++ |
| :--- | :--- | :--- |
| 动态数组 | `ArrayList<Integer>` | `vector<int>` |
| 二维数组 | `List<List<Integer>>` | `vector<vector<int>>` |
| 栈 | `Deque<Integer>`（`ArrayDeque`） | `stack<int>` |
| 队列 | `Queue<Integer>`（`ArrayDeque`） | `queue<int>` |
| 优先队列 | `PriorityQueue<Integer>` | `priority_queue<int>` |
| 哈希表 | `HashMap<K,V>` | `unordered_map<K,V>` |
| 哈希集合 | `HashSet<Integer>` | `unordered_set<int>` |
| 键值对 | `int[] pair` 或 `Map.Entry` | `pair<int,int>` |

`vector` 的声明跟 Java 那两个步骤相像：Java 是 `List<Integer> list = new ArrayList<>()`，C++ 直接写 `vector<int> list;` 就是一个可用的空数组，不需要再 `new` 一个实现类。

需要预置初值、预置长度时，构造函数里带上参数就行：

```cpp
vector<int> a;                 // 空数组
vector<int> b(5, 0);           // 长度 5，全是 0
vector<int> c = {1, 2, 3};     // 直接给初值
vector<bool> used(n, false);   // 长度 n，全是 false
```

> [!WARNING]
> **第一，`pop` 不返回值。** Java 的 `stack.pop()` 一步拿到栈顶，C++ 得先 `top()` 取值再 `pop()` 弹出。队列同理，先 `front()` 后 `pop()`。


```cpp
stack<int> st;
st.push(1);
int top = st.top();   // 先取值
st.pop();             // 再弹出，pop() 的返回类型是 void
```

> [!WARNING]
> **第二，`priority_queue` 默认是大根堆。** Java 的 `PriorityQueue` 默认小根堆，C++ 正好相反。想要小根堆得写全模板参数：


```cpp
priority_queue<int> big;                                    // 大根堆，堆顶最大
priority_queue<int, vector<int>, greater<int>> small;        // 小根堆，堆顶最小
```

> [!WARNING]
> **第三，`size()` 返回的是无符号数。** `vector.size()` 的类型是 `size_t`，拿它和 `int` 比较会出现编译警告，`nums.size() - 1` 在空数组时会绕成一个巨大的正数。习惯写法是显式转一下：


```cpp
int n = (int)nums.size();
```

> [!WARNING]
> **第四，`unordered_map` 取不到值时不会返回 null。** Java 的 `map.get(k)` 拿不到就是 `null`，C++ 的 `mp[k]` 会顺手插一个默认值进去，很容易在计数题里把表撑大。判断存在用 `count`，或者在确认存在之后再用 `[]`：


```cpp
if (mp.count(key)) {
    int v = mp[key];
}
```

## 4. 字符串

`string` 和 Java 的 `String` 用法高度重合，只是方法名短一些，而且 `string` 本身可变。

| 操作 | Java | C++ |
| :--- | :--- | :--- |
| 取长度 | `s.length()` | `s.size()` |
| 取单个字符 | `s.charAt(i)` | `s[i]` |
| 取子串 | `s.substring(a, b)` | `s.substr(a, b - a)` |
| 拼接 | `s + t` | `s + t` |
| 字符转数字 | `c - '0'` | `c - '0'` |
| 字符串转整数 | `Integer.parseInt(s)` | `stoi(s)` |
| 整数转字符串 | `String.valueOf(x)` | `to_string(x)` |

`substring(a, b)` 是左闭右开，`substr(a, len)` 第二个参数是长度而不是结束下标，从 Java 过去最容易在这里差一位。

遍历时 C++ 可以用范围 for，比 Java 的 `toCharArray()` 干净：

```cpp
for (char c : s) {
    if (c == 'a') {
        // ...
    }
}
```

## 5. 排序和比较器

Java 的 `Arrays.sort` 和 `list.sort(Comparator)` 到了 C++ 统一成 `sort(begin, end)`，第三个参数接一个返回 `bool` 的比较函数。

```cpp
vector<int> a = {3, 1, 2};
sort(a.begin(), a.end());                          // 升序
sort(a.begin(), a.end(), greater<int>());          // 降序

// 二维数组按第一列排，等价于 Java 的 Arrays.sort(intervals, (x, y) -> x[0] - y[0])
sort(intervals.begin(), intervals.end(),
     [](const vector<int>& x, const vector<int>& y) {
         return x[0] < y[0];
     });
```

`greater<int>()` 和 lambda 这两样东西在考卷上出现频率很高，尤其合并区间这类题。lambda 的写法记住外形就行，`[]` 里是捕获列表，参数写类型，最后一行是 `return 条件;`，条件成立时排前面。

## 十道高频题

### 第一题：反转链表

:::tabs
```java
class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode prev = null;
        ListNode curr = head;
        while (curr != null) {
            ListNode next = curr.next;
            curr.next = prev;
            prev = curr;
            curr = next;
        }
        return prev;
    }
}
```

```cpp
class Solution {
public:
    ListNode* reverseList(ListNode* head) {
        ListNode* prev = nullptr;
        ListNode* curr = head;
        while (curr != nullptr) {
            ListNode* next = curr->next;
            curr->next = prev;
            prev = curr;
            curr = next;
        }
        return prev;
    }
};
```
:::

逐行一致，只换了类型和标点。这类纯指针操作题是转换成本最低的，写的时候甚至不用想算法，把 `.` 换成 `->` 就行。

### 第二题：合并两个有序链表

:::tabs
```java
class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        ListNode dummy = new ListNode(-1);
        ListNode tail = dummy;
        while (list1 != null && list2 != null) {
            if (list1.val <= list2.val) {
                tail.next = list1;
                list1 = list1.next;
            } else {
                tail.next = list2;
                list2 = list2.next;
            }
            tail = tail.next;
        }
        tail.next = (list1 != null) ? list1 : list2;
        return dummy.next;
    }
}
```

```cpp
class Solution {
public:
    ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
        ListNode* dummy = new ListNode(0);   // 跟 Java 一样，哨兵得 new 出来
        ListNode* tail = dummy;
        while (list1 != nullptr && list2 != nullptr) {
            if (list1->val <= list2->val) {
                tail->next = list1;
                list1 = list1->next;
            } else {
                tail->next = list2;
                list2 = list2->next;
            }
            tail = tail->next;
        }
        tail->next = (list1 != nullptr) ? list1 : list2;
        return dummy->next;
    }
};
```
:::

这里就保持和 Java 一模一样的写法：`new` 一个哨兵，`tail` 指向它，最后返回 `dummy->next`。返回的链表节点全是题目原来就有的，哨兵本身不带出去，你也不用去想它什么时候消失。

另外，Java 里 `dummy.next` 写点号，C++ 里 `dummy` 是 `ListNode*`，所以要写 `dummy->next`。整个函数里每一处成员访问都是箭头，因为手上拿的全是指针。

### 第三题：环形链表 II

:::tabs
```java
class Solution {
    public ListNode detectCycle(ListNode head) {
        ListNode slow = head;
        ListNode fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) {
                ListNode p = head;
                while (p != slow) {
                    p = p.next;
                    slow = slow.next;
                }
                return p;
            }
        }
        return null;
    }
}
```

```cpp
class Solution {
public:
    ListNode* detectCycle(ListNode* head) {
        ListNode* slow = head;
        ListNode* fast = head;
        while (fast != nullptr && fast->next != nullptr) {
            slow = slow->next;
            fast = fast->next->next;
            if (slow == fast) {
                ListNode* p = head;
                while (p != slow) {
                    p = p->next;
                    slow = slow->next;
                }
                return p;
            }
        }
        return nullptr;
    }
};
```
:::

`fast->next->next` 这种连续箭头是 C++ 写链表的基本语法，Java 那边写 `fast.next.next`。两边的判空条件一样不能少，短路求值都会先看 `fast` 再决定要不要继续取 `fast->next`。

### 第四题：二叉树的最大深度

:::tabs
```java
class Solution {
    public int maxDepth(TreeNode root) {
        if (root == null) {
            return 0;
        }
        return Math.max(maxDepth(root.left), maxDepth(root.right)) + 1;
    }
}
```

```cpp
class Solution {
public:
    int maxDepth(TreeNode* root) {
        if (root == nullptr) {
            return 0;
        }
        return max(maxDepth(root->left), maxDepth(root->right)) + 1;
    }
};
```
:::

`Math.max` 换成 `max`。力扣会自动带上 `#include <bits/stdc++.h>` 和 `using namespace std;`，所以不用写 `std::max`。考试如果给的是纯 C++ 环境而且只 include 了 `<iostream>`，那就得自己补 `<algorithm>`，或者在纸上直接写三元运算符 `(a > b ? a : b)`，最保险。

同一个写法还有一处容易踩的地方：`int maxDepth(TreeNode* root)` 这类函数**返回前必须保证每条路径都有 return**。Java 编译器不管这事，C++ 会直接报错，所以空节点那个 `return 0;` 一定要写在最前面。

### 5. 层序遍历

:::tabs
```java
class Solution {
    public List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> res = new ArrayList<>();
        if (root == null) {
            return res;
        }
        Queue<TreeNode> q = new ArrayDeque<>();
        q.offer(root);
        while (!q.isEmpty()) {
            int size = q.size();
            List<Integer> level = new ArrayList<>();
            for (int i = 0; i < size; i++) {
                TreeNode node = q.poll();
                level.add(node.val);
                if (node.left != null) {
                    q.offer(node.left);
                }
                if (node.right != null) {
                    q.offer(node.right);
                }
            }
            res.add(level);
        }
        return res;
    }
}
```

```cpp
class Solution {
public:
    vector<vector<int>> levelOrder(TreeNode* root) {
        vector<vector<int>> res;
        if (root == nullptr) {
            return res;
        }
        queue<TreeNode*> q;
        q.push(root);
        while (!q.empty()) {
            int size = (int)q.size();   // 先记下这一层的节点数
            vector<int> level;
            for (int i = 0; i < size; ++i) {
                TreeNode* node = q.front();
                q.pop();
                level.push_back(node->val);
                if (node->left != nullptr) {
                    q.push(node->left);
                }
                if (node->right != nullptr) {
                    q.push(node->right);
                }
            }
            res.push_back(level);
        }
        return res;
    }
};
```
:::

`offer` 对 `push`，`poll` 对先 `front` 再 `pop`，`isEmpty` 对 `empty`。`size` 那句最好显式写成 `(int)q.size()`，不然 `i < q.size()` 是 `int` 和 `size_t` 混比某些编译器会警告，而且 `q.size()` 在循环里会随着 `push` 变化，先存下来才是对的。

### 6. 二叉树的中序遍历（迭代版）

:::tabs
```java
class Solution {
    public List<Integer> inorderTraversal(TreeNode root) {
        List<Integer> res = new ArrayList<>();
        Deque<TreeNode> st = new ArrayDeque<>();
        TreeNode curr = root;
        while (curr != null || !st.isEmpty()) {
            while (curr != null) {
                st.push(curr);
                curr = curr.left;
            }
            curr = st.pop();
            res.add(curr.val);
            curr = curr.right;
        }
        return res;
    }
}
```

```cpp
class Solution {
public:
    vector<int> inorderTraversal(TreeNode* root) {
        vector<int> res;
        stack<TreeNode*> st;
        TreeNode* curr = root;
        while (curr != nullptr || !st.empty()) {
            while (curr != nullptr) {
                st.push(curr);
                curr = curr->left;
            }
            curr = st.top();     // 先取值
            st.pop();            // 再弹出
            res.push_back(curr->val);
            curr = curr->right;
        }
        return res;
    }
};
```
:::

Java 的 `st.pop()` 同时取出并删除，C++ 拆成 `top()` 和 `pop()` 两行，忘了写 `pop()` 会直接死循环。

### 7. 全排列

:::tabs
```java
class Solution {
    public List<List<Integer>> permute(int[] nums) {
        List<List<Integer>> res = new ArrayList<>();
        List<Integer> path = new ArrayList<>();
        boolean[] used = new boolean[nums.length];
        dfs(nums, path, used, res);
        return res;
    }

    private void dfs(int[] nums, List<Integer> path, boolean[] used,
                     List<List<Integer>> res) {
        if (path.size() == nums.length) {
            res.add(new ArrayList<>(path));   // 必须拷贝一份
            return;
        }
        for (int i = 0; i < nums.length; i++) {
            if (used[i]) continue;
            used[i] = true;
            path.add(nums[i]);
            dfs(nums, path, used, res);
            path.remove(path.size() - 1);
            used[i] = false;
        }
    }
}
```

```cpp
class Solution {
public:
    vector<vector<int>> permute(vector<int>& nums) {
        vector<vector<int>> res;
        vector<int> path;
        vector<bool> used(nums.size(), false);
        dfs(nums, path, used, res);
        return res;
    }

private:
    void dfs(vector<int>& nums, vector<int>& path, vector<bool>& used,
             vector<vector<int>>& res) {
        if (path.size() == nums.size()) {
            res.push_back(path);   // push_back 自带拷贝，不用手动复制
            return;
        }
        for (int i = 0; i < (int)nums.size(); ++i) {
            if (used[i]) continue;
            used[i] = true;
            path.push_back(nums[i]);
            dfs(nums, path, used, res);
            path.pop_back();
            used[i] = false;
        }
    }
};
```
:::

C++ 里 `path` 必须写 `vector<int>&`，写成 `vector<int> path` 的话每层递归都在复制，回溯完全失效，答案会是空的或者只有全空。而 `res.push_back(path)` 本身就是把 `path` 当前内容复制进结果集，所以不需要像 Java 那样再包一层 `new ArrayList<>(path)`。

`vector<bool> used(nums.size(), false)` 的意思是“长度为 `nums.size()`，每个元素初始化为 `false`”，比 Java 的 `new boolean[n]` 多了一个初值参数，而 `vector<int> dp(n, 0)` 的写法和它一样。

### 8. 二分查找

:::tabs
```java
class Solution {
    public int search(int[] nums, int target) {
        int left = 0;
        int right = nums.length - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) {
                return mid;
            }
            if (nums[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return -1;
    }
}
```

```cpp
class Solution {
public:
    int search(vector<int>& nums, int target) {
        int left = 0;
        int right = (int)nums.size() - 1;
        while (left <= right) {
            int mid = left + (right - left) / 2;
            if (nums[mid] == target) {
                return mid;
            }
            if (nums[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return -1;
    }
};
```
:::

`nums.length` 换成 `nums.size()`，而且**一定要先转 int 再减一**。直接写 `nums.size() - 1` 的话空数组会得到一个巨大的无符号数，后面的比较全部失常。

### 9. 有效的括号

:::tabs
```java
class Solution {
    public boolean isValid(String s) {
        Deque<Character> st = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            if (c == '(') {
                st.push(')');
            } else if (c == '[') {
                st.push(']');
            } else if (c == '{') {
                st.push('}');
            } else {
                if (st.isEmpty() || st.peek() != c) {
                    return false;
                }
                st.pop();
            }
        }
        return st.isEmpty();
    }
}
```

```cpp
class Solution {
public:
    bool isValid(string s) {
        stack<char> st;
        for (char c : s) {
            if (c == '(') {
                st.push(')');
            } else if (c == '[') {
                st.push(']');
            } else if (c == '{') {
                st.push('}');
            } else {
                if (st.empty() || st.top() != c) {
                    return false;
                }
                st.pop();
            }
        }
        return st.empty();
    }
};
```
:::

`String` 和 `char` 的互转在 C++ 里几乎不存在，`string` 直接能按字符遍历，`char` 就是字符类型本身，不用 `Character` 包装类。`stack<char>` 里存的就是真字符，取出来和 `c` 比较不会有对象相等的坑。

### 10. 最小的 k 个数

:::tabs
```java
class Solution {
    public int[] getLeastNumbers(int[] arr, int k) {
        PriorityQueue<Integer> pq = new PriorityQueue<>((a, b) -> b - a);  // 大根堆
        for (int x : arr) {
            pq.offer(x);
            if (pq.size() > k) {
                pq.poll();
            }
        }
        int[] res = new int[k];
        for (int i = 0; i < k; i++) {
            res[i] = pq.poll();
        }
        return res;
    }
}
```

```cpp
class Solution {
public:
    vector<int> getLeastNumbers(vector<int>& arr, int k) {
        priority_queue<int> pq;   // C++ 默认就是大根堆，正好对味
        for (int x : arr) {
            pq.push(x);
            if ((int)pq.size() > k) {
                pq.pop();
            }
        }
        vector<int> res;
        while (!pq.empty()) {
            res.push_back(pq.top());
            pq.pop();
        }
        return res;
    }
};
```
:::

Java 要靠 `(a, b) -> b - a` 才能把 `PriorityQueue` 掰成大根堆，C++ 的 `priority_queue` 默认就是大根堆，一行声明搞定。反过来，需要小根堆的时候 C++ 才要写全 `priority_queue<int, vector<int>, greater<int>>`。

## 检查清单

1. **`class Solution` 后面有没有 `public:`**，整个类的结尾有没有分号。
2. **每条语句末尾有没有分号**，尤其是 `return` 那一行和 `for` 内部的语句。
3. **指针用箭头，本体用点号**。`ListNode* p` 配 `p->val`，写成 `p.val` 就编译不过。
4. **递归函数每条路径都有 return**，空节点分支写在最前面。
5. **需要修改的参数是不是引用**。回溯的 `path`，统计用的 `int& ans`，漏了 `&` 就白写。
6. **`size()` 有没有转 int**，`(int)nums.size() - 1` 这种写法最稳。
7. **栈和队列有没有拆成两步**，`top()` 之后再 `pop()`，`front()` 之后再 `pop()`。
8. **优先队列方向对不对**，C++ 默认大根堆，要小根堆得写全模板参数。
9. **累加会不会溢出**。路径和这类题中间结果可能超出 `int`，把变量声明成 `long long`，起始值写 `LLONG_MIN` 而不是 `INT_MIN`。
10. **二维数组的初始化**，`vector<vector<int>> res(n, vector<int>(m, 0))`，一行建好 n 乘 m 的全零矩阵，比 Java 嵌套 new 更省事。


