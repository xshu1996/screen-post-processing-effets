interface ListNode<T>
{
    val: T
    next: ListNode<T> | null,
    prev: ListNode<T> | null,
}

class ListNode<T>
{
    val: T = null;
    prev: ListNode<T> = null;
    next: ListNode<T> = null;

    constructor(val: T)
    {
        this.val = val;
    }
}

export class List<T>
{
    public static from<L>(array: L[]): List<L>
    {
        const { length } = array;
        const list = new List(array.shift());
        list.length = length;

        array.reduce((prev: ListNode<L>, curr: L) =>
        {
            prev.next = new ListNode(curr);
            prev.next.prev = prev;
            return prev.next;
        }, list.head);

        return list;
    }
    /** 哨兵头节点 */
    dummyHead: ListNode<T>;
    head: ListNode<T>;
    /** 链表长度，不包含 dummy head */
    length: number;

    constructor(val: T)
    {
        this.dummyHead = new ListNode(null);
        this.head = new ListNode(val);
        this.dummyHead.next = this.head;
        this.dummyHead.prev = null;
        this.head.next = null;
        this.head.prev = this.dummyHead;
        this.length = 1;
    }

    find(handle: (ele: ListNode<T>) => boolean): ListNode<T> | null
    {
        var i;
        var curr = this.head;
        for (i = 0; i < this.length; ++i)
        {
            if (handle.call(this, curr))
            {
                break;
            }
            curr = curr.next;
        }
        return i !== this.length ? curr : null;
    }

    insert(val: T, node: ListNode<T>): void
    {
        const newNode = new ListNode(val);
        const currNode = this.find(n => n === node);
        if (currNode.next)
        {
            newNode.next = currNode.next;
            currNode.next.prev = newNode;
            currNode.next = newNode;
            newNode.prev = currNode;
        }
        else 
        {
            currNode.next = newNode;
            newNode.prev = currNode;
        }
    }

    remove(node: ListNode<T>): void
    {
        if (node === null)
        {
            return;
        }
        const deletedNode = this.find(n => n === node);
        if (deletedNode)
        {
            if (this.head === deletedNode)
            {
                this.head = deletedNode.next;
            }
            deletedNode.prev.next = deletedNode.next;
            deletedNode.next.prev = deletedNode.prev;
            this.length--;
        }
    }
}