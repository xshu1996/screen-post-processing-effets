/**
 * @class Queue
 */
export class Queue<T>
{
    private _elements: T[] = null;
    private _offset: number = 0;

    /**
     * Creates a queue.
     * @param {array} [elements]
     */
    constructor(elements?: T[])
    {
        this._elements = Array.isArray(elements) ? elements : [];
        this._offset = 0;
    }

    /**
     * Adds an element at the back of the queue.
     * @public
     * @param {any} element
     */
    public enqueue(element: T): Queue<T>
    {
        this._elements.push(element);
        return this;
    }

    /**
     * Dequeues the front element in the queue.
     * @public
     * @returns {any}
     */
    public dequeue(): T
    {
        if (this.size() === 0) 
        {
            return null;
        }

        const first = this.front();
        this._offset += 1;

        if (this._offset * 2 < this._elements.length) return first;

        // only remove dequeued elements when reaching half size
        // to decrease latency of shifting elements.
        this._elements = this._elements.slice(this._offset);
        this._offset = 0;

        return first;
    }

    /**
     * Returns the front element of the queue.
     * @public
     * @returns {any}
     */
    public front(): T
    {
        return this.size() > 0 ? this._elements[this._offset] : null;
    }

    /**
     * Returns the back element of the queue.
     * @public
     * @returns {any}
     */
    public back(): T
    {
        return this.size() > 0 ? this._elements[this._elements.length - 1] : null;
    }

    /**
     * Returns the number of elements in the queue.
     * @public
     * @returns {number}
     */
    public size(): number
    {
        return this._elements.length - this._offset;
    }

    /**
     * Checks if the queue is empty.
     * @public
     * @returns {boolean}
     */
    public isEmpty(): boolean
    {
        return this.size() === 0;
    }

    /**
     * Returns the remaining elements in the queue as an array.
     * @public
     * @returns {array}
     */
    public toArray(): T[]
    {
        return this._elements.slice(this._offset);
    }

    /**
     * Clears the queue.
     * @public
     */
    public clear(): void
    {
        this._elements = [];
        this._offset = 0;
    }

    /**
     * Creates a shallow copy of the queue.
     * @public
     * @return {Queue}
     */
    public clone(): Queue<T>
    {
        return new Queue(this._elements.slice(this._offset));
    }

    /**
     * Creates a queue from an existing array.
     * @public
     * @static
     * @param {array} elements
     * @return {Queue}
     */
    public static fromArray<T>(elements: T[]): Queue<T>
    {
        return new Queue(elements);
    }
}