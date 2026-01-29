export type ColumnType = 'text' | 'status' | 'date' | 'number' | 'dropdown' | 'checkbox' | 'link' | 'people';

export interface ColumnOption {
    id: string;
    label: string;
    color: string;
}

export interface Column {
    id: string;
    title: string;
    type: ColumnType;
    options?: ColumnOption[]; // For Status/Dropdown
    width?: number; // Custom width in px
    order: number;
    aggregation?: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'none';
}

export interface ItemValue {
    [columnId: string]: any;
}

export interface Group {
    id: string;
    title: string;
    color: string;
    items: Item[];
}


export interface Comment {
    id: string;
    content: string;
    createdAt: string;
    author: string;
}

export interface Item {
    id: string;
    title: string;
    // The "Name" or first frozen column is stored in 'title',
    // but the system treats it as a column for rendering in some contexts.
    groupId: string; // Link to Group
    values: ItemValue;
    updates?: Comment[]; // For Task Sidebar
    isHidden?: boolean;
}

export interface SortState {
    columnId: string;
    direction: 'asc' | 'desc';
}

export interface FilterState {
    columnId: string;
    values: string[]; // List of values to include (for status/dropdown/checkbox)
}

export interface Workspace {
    id: string;
    title: string;
    order: number;
    owner_id: string;
}



export interface Board {
    id: string;
    workspaceId?: string; // Link to specific Workspace
    subWorkspaceId?: string; // Optional: Link to a SubWorkspace
    title: string;
    columns: Column[];
    groups: Group[]; // Ordered list of groups
    items: Item[];
    itemColumnTitle?: string; // Customizable title for the first "Item" layout column
    itemColumnWidth?: number; // Custom width for the first column
    groupByColumnId?: string | null; // For dynamic view overrides (optional future)
    collapsedGroups?: string[];

    // View State (Transient or Persistent)
    sort?: SortState | null;
    filters?: FilterState[]; // Support multiple column filters
}
