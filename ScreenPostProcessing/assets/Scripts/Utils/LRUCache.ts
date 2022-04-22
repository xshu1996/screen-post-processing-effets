export class DoublyListNode<V>
{
    static readonly POOL: DoublyListNode<any>[] = [];
    static create<V>(key: string, val: V): DoublyListNode<V>
    {
        let dbNode = DoublyListNode.POOL.pop();
        if (!dbNode)
        {
            dbNode = new DoublyListNode<V>("", null);
        }
        dbNode.setKey(key);
        dbNode.setVal(val);
        return dbNode;
    }

    key: string = "";
    val: V = null;
    prev: DoublyListNode<V> = null;
    next: DoublyListNode<V> = null;

    constructor(key: string, val: V)
    {
        this.key = key;
        this.val = val;
    }

    setKey(key: string): void
    {
        this.key = key;
    }

    setVal(val: V): void
    {
        this.val = val;
    }

    clear(destroy: boolean = false): void
    {
        this.prev = null;
        this.next = null;
        if (destroy)
        {
            this.val = null;
            this.key = "";
            DoublyListNode.POOL.push(this);
        }
    }
}

export interface LRU<V>
{
    get(key: string): V | null;
    put(key: string, val: V): void;
}

/**
 * Least Recently Used
 * @author xshu
 * 测试用例：https://leetcode-cn.com/problems/lru-cache/
 */
export class LURCache<V> implements LRU<V>
{
    /** 默认容积 */
    private static DEFAULT_CAPACITY: number = 8;
    private _map: Map<string, DoublyListNode<V>>;
    private _capacity: number;
    /** 哨兵头节点 */
    private _dummyHead: DoublyListNode<V>;
    /** 哨兵尾节点 */
    private _dummyTail: DoublyListNode<V>;
    private _size: number;

    constructor(capacity: number = LURCache.DEFAULT_CAPACITY)
    {
        this._capacity = capacity;
        this._map = new Map();
        this._size = 0;

        this._dummyHead = DoublyListNode.create("DummyHead", null);
        this._dummyTail = DoublyListNode.create("DummyTail", null);
        this._dummyHead.next = this._dummyTail;
        this._dummyTail.prev = this._dummyHead;        
    }

    public getCapacity(): number
    {
        return this._capacity;
    }

    public get(key: string): V | null
    {
        if (!this._map.has(key))
        {
            return null;
        }

        let node: DoublyListNode<V> = this._map.get(key);
        this.makeLeastRecently(node);
        return this._map.get(key).val;
    }

    public put(key: string, val: V): void
    {
        if (this._map.has(key))
        {
            let node: DoublyListNode<V> = this._map.get(key);
            node.setVal(val);
            this.makeLeastRecently(node);
            return;
        }
        // 如果容量到达上限，删除最近最少使用
        if (this._size >= this._capacity)
        {
            this.removeLeastRecently();
        }

        let newNode: DoublyListNode<V> = DoublyListNode.create(key, val);
        this.insert2Head(newNode);
        this._map.set(key, newNode);
        this._size++;
    }

    /** 将已有的节点移动到头部 */
    private move2Head(node: DoublyListNode<V>): void
    {
        this.deleteNode(node);
        this.insert2Head(node);
    }

    /** 插入一个新的节点到头节点 */
    private insert2Head(node: DoublyListNode<V>): void
    {
        const next: DoublyListNode<V> = this._dummyHead.next;
        this._dummyHead.next = node;
        node.prev = this._dummyHead;
        node.next = next;
        next.prev = node;
    }

    private makeLeastRecently(node: DoublyListNode<V>): void
    {
        this.move2Head(node);
    }

    /** 移除最近最少使用的节点 */
    private removeLeastRecently(): void
    {
        let prev: DoublyListNode<V> = this._dummyTail.prev;
        let prevKey = prev.key;
        this.deleteNode(prev, true);
        this._map.delete(prevKey);
        this._size--;
    }

    private deleteNode(node: DoublyListNode<V>, isDestroy: boolean = false): void
    {
        let prev: DoublyListNode<V> = node.prev;
        let next: DoublyListNode<V> = node.next;

        // 排除 dummy 节点
        if (prev && next)
        {
            next.prev = prev;
            prev.next = next;
            node.clear(isDestroy);
        }
    }

    public size(): number
    {
        return this._size;
    }

    /**
     * @override
     */
    public clear(): void
    {
        throw "override it";
    }
}