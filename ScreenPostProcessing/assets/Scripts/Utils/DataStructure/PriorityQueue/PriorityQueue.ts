import { Heap, ICompare } from "../Heap/Heap";

/**
 * @class PriorityQueue
 */
export class PriorityQueue<T>
{

    private _heap: Heap<T> = null;

    /**
     * Creates a priority queue
     * @params {function} compare
     */
    constructor(compare: ICompare<T>, _values?: T[])
    {
        if (typeof compare !== 'function')
        {
            throw new Error('PriorityQueue constructor expects a compare function');
        }
        this._heap = new Heap(compare, _values);
        if (_values)
        {
            this._heap.fix();
        }
    }

    /**
     * Returns an element with highest priority in the queue
     * @public
     * @returns {number|string|object}
     */
    public front(): T | null
    {
        return this._heap.root();
    }

    /**
     * Returns an element with lowest priority in the queue
     * @public
     * @returns {number|string|object}
     */
    public back(): T
    {
        return this._heap.leaf();
    }

    /**
     * Adds a value to the queue
     * @public
     * @param {number|string|object} value
     * @returns {Heap}
     */
    public enqueue(value: T): PriorityQueue<T>
    {
        this._heap.insert(value);
        return this;
    }

    /**
     * Removes and returns an element with highest priority in the queue
     * @public
     * @returns {number|string|object}
     */
    public dequeue(): T
    {
        return this._heap.extractRoot();
    }

    /**
     * Returns the number of elements in the queue
     * @public
     * @returns {number}
     */
    public size(): number
    {
        return this._heap.size();
    }

    /**
     * Checks if the queue is empty
     * @public
     * @returns {boolean}
     */
    public isEmpty(): boolean
    {
        return this._heap.isEmpty();
    }

    /**
     * Clears the queue
     * @public
     */
    public clear(): void
    {
        this._heap.clear();
    }

    /**
     * Returns a sorted list of elements from highest to lowest priority
     * @public
     * @returns {array}
     */
    public toArray(): T[]
    {
        return this._heap.clone().sort().reverse();
    }

    /**
     * Creates a priority queue from an existing array
     * @public
     * @static
     * @returns {PriorityQueue}
     */
    public static fromArray<T>(values: T[], compare: ICompare<T>): PriorityQueue<T>
    {
        return new PriorityQueue(compare, values);
    }
}