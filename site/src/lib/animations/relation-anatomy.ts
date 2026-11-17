/**
 * relation-anatomy.ts — 解剖关系模型里的一张表，预生成不可变步骤快照。
 *
 * 例子取自 CMU 15-445/645 Lecture #01 的 Artist(id, name, year, country)：
 * 101 Wu-Tang Clan 1992 USA / 102 Notorious BIG 1992 USA / 103 GZA 1990 USA。
 * 七步依次把整张表、一行、一列、一列的 domain、schema、instance 和主键圈出来，
 * 每一步都是一份完整快照，播放定时器只负责移动步骤指针，表数据从头到尾不修改。
 */

/** 七步分别对应的概念。 */
export type AnatomyFocus =
  | 'relation'
  | 'tuple'
  | 'attribute'
  | 'domain'
  | 'schema'
  | 'instance'
  | 'primary-key';

/** 本步高亮哪一块画面。 */
export type AnatomyScope = 'table' | 'row' | 'column' | 'header' | 'rows';

export interface AnatomyRow {
  id: number;
  name: string;
  year: number;
  country: string;
}

export interface AnatomyColumn {
  /** 对应 AnatomyRow 的字段名，渲染时直接取值。 */
  key: keyof AnatomyRow;
  label: string;
  /** 列的数据类型，显示在表头下方。 */
  type: string;
  primaryKey: boolean;
}

/** domain 步骤里画出的一个取值，used 表示表里真的出现了这个值。 */
export interface AnatomyDomainValue {
  value: string;
  used: boolean;
}

/** 表格下方观察窗的内容。 */
export interface AnatomyInspector {
  label: string;
  /** 等宽字体的一行文本，domain 步骤留空 */
  value?: string;
  /** domain 步骤画成取值集合 */
  domain?: AnatomyDomainValue[];
  /** 观察窗右侧的补充说明 */
  note?: string;
}

export interface RelationAnatomyStep {
  focus: AnatomyFocus;
  /** 阶段名，显示在步骤说明左侧 */
  phase: string;
  /** 一句话定义，显示在表格上方的概念条 */
  definition: string;
  /** 当前高亮范围的人话描述 */
  target: string;
  /** 中文讲解 */
  description: string;
  scope: AnatomyScope;
  /** scope 为 row 时高亮第几行（从 0 开始） */
  row: number | null;
  /** scope 为 column 时高亮哪一列 */
  column: keyof AnatomyRow | null;
  inspector: AnatomyInspector;
}

export interface RelationAnatomyTrace {
  name: string;
  columns: AnatomyColumn[];
  rows: AnatomyRow[];
  /** 等宽字体展示的 schema 摘要 */
  schema: string;
  steps: RelationAnatomyStep[];
}

export const ARTIST_NAME = 'Artist';

/** 列顺序就是表头顺序，类型取自 Lecture #01 的 CREATE TABLE Artist。 */
export const ARTIST_COLUMNS: AnatomyColumn[] = [
  { key: 'id', label: 'id', type: 'INT', primaryKey: true },
  { key: 'name', label: 'name', type: 'VARCHAR', primaryKey: false },
  { key: 'year', label: 'year', type: 'INT', primaryKey: false },
  { key: 'country', label: 'country', type: 'CHAR(60)', primaryKey: false },
];

/** 表里的三行数据，顺序和课件一致。 */
export const ARTIST_ROWS: AnatomyRow[] = [
  { id: 101, name: 'Wu-Tang Clan', year: 1992, country: 'USA' },
  { id: 102, name: 'Notorious BIG', year: 1992, country: 'USA' },
  { id: 103, name: 'GZA', year: 1990, country: 'USA' },
];

export const ARTIST_SCHEMA = 'Artist(id INT, name VARCHAR, year INT, country CHAR(60))';

function rowText(row: AnatomyRow) {
  return `(${row.id}, ${row.name}, ${row.year}, ${row.country})`;
}

export function createRelationAnatomyTrace(): RelationAnatomyTrace {
  const rows = ARTIST_ROWS;
  const steps: RelationAnatomyStep[] = [
    {
      focus: 'relation',
      phase: '整张表',
      definition: 'relation 就是一张表，是一组结构相同的 tuple。',
      target: '高亮整张 Artist 表',
      description:
        '把三行四列放在一起看，整张 Artist 表就是一个 relation，也就是关系。关系模型里 relation 和 table 是同义词，本演示后面统称表。',
      scope: 'table',
      row: null,
      column: null,
      inspector: {
        label: '关系里有什么',
        value: '3 个 tuple × 4 个 attribute',
      },
    },
    {
      focus: 'tuple',
      phase: '一个 tuple',
      definition: 'tuple 是表里的一行，表示一个实体。',
      target: '高亮第 2 行（id 为 101）',
      description: `第 2 行 ${rowText(rows[0])} 是一个 tuple，读作元组。它把一位歌手的四个属性值打包在一起，表里有多少个实体，就有多少个 tuple。`,
      scope: 'row',
      row: 0,
      column: null,
      inspector: {
        label: '第 2 行 tuple',
        value: rowText(rows[0]),
      },
    },
    {
      focus: 'attribute',
      phase: '一个 attribute',
      definition: 'attribute 是表里的一列，同一列描述同一件事。',
      target: '高亮 year 列',
      description:
        'year 这一列是一个 attribute，读作属性。这一列的两个 1992 和一个 1990 都在回答同一个问题，就是这位歌手哪一年出道。把 year 抽出来，就得到一个长度为 3 的取值序列。',
      scope: 'column',
      row: null,
      column: 'year',
      inspector: {
        label: 'year 列的 3 个值',
        value: `${rows[0].year}, ${rows[1].year}, ${rows[2].year}`,
      },
    },
    {
      focus: 'domain',
      phase: 'domain 取值',
      definition: 'domain 是一个属性允许出现的值的集合。',
      target: '高亮 year 列的 domain',
      description:
        '每个 attribute 都有自己的 domain，也就是这一列允许放的值的集合。year 声明成整数，domain 就是整数集合，表里的 1990 和 1992 只是从中取的两个值。',
      scope: 'column',
      row: null,
      column: 'year',
      inspector: {
        label: 'domain(year)',
        domain: [
          { value: '1989', used: false },
          { value: '1990', used: true },
          { value: '1991', used: false },
          { value: '1992', used: true },
          { value: '1993', used: false },
        ],
        note: '省略号表示整数集合里还有更多值',
      },
    },
    {
      focus: 'schema',
      phase: 'schema 结构',
      definition: 'schema 描述表的结构：有哪些列，每列什么类型，有什么约束。',
      target: '高亮表头与类型定义',
      description:
        'schema 是这张表的结构声明。表叫 Artist，一共四列，每列写明名字和类型，还规定 id 是主键。schema 在建表时定义一次，之后保持不变。',
      scope: 'header',
      row: null,
      column: null,
      inspector: {
        label: 'schema 定义',
        value: ARTIST_SCHEMA,
        note: 'id 是主键，name 不允许为空',
      },
    },
    {
      focus: 'instance',
      phase: 'instance 数据',
      definition: 'instance 是某一时刻表里实际装的数据。',
      target: '高亮当前三行数据',
      description:
        'instance 是此刻表里真实装着的所有 tuple。往表里加一位歌手或者删掉一行，改变的是 instance，schema 还是原来那套。',
      scope: 'rows',
      row: null,
      column: null,
      inspector: {
        label: '当前 instance',
        value: `${rows.length} 个 tuple，改动的只是这里的数据`,
      },
    },
    {
      focus: 'primary-key',
      phase: 'primary key',
      definition: 'primary key 唯一标识表里的每一个 tuple。',
      target: '高亮 id 列（primary key）',
      description:
        'id 列是这张表的主键。三个取值 101，102，103 互不相同，也没有空值，所以只要给出一个 id，就能唯一定位一行。别的列做不到这一点，比如两位歌手的 year 都是 1992。',
      scope: 'column',
      row: null,
      column: 'id',
      inspector: {
        label: '主键取值',
        value: `{${rows.map((row) => row.id).join(', ')}} 互不相同且不为空`,
      },
    },
  ];

  return {
    name: ARTIST_NAME,
    columns: ARTIST_COLUMNS,
    rows,
    schema: ARTIST_SCHEMA,
    steps,
  };
}
