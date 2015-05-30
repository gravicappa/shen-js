# Shen-js threads
Shen-js's threads are green threads.

## Threads
`js.make-thread` creates a thread and starts it. It receives a single argument
which can be either zero-place function object or freeze object:

    (js.make-thread (function some-code))
    (js.make-thread (freeze (some-code Arg1)))

It returns a thread id which is not used anywhere outside.

## Channels
Channels are stream-like facilities suitable for inter-thread communication.
If a thread tries to read from channel with empty buffer it becomes dormant
until channel is written to. Reading from closed channel returns `fail`.

Create a channel

    (js.chan)

Read from a channel

    (js.chan-read Ch)

Write to a channel
    
    (js.chan-write Value Ch)

Close a channel

    (js.chan-close Ch)

## Miscellaneous
To stop current thread for a time of given milliseconds

    (js.sleep-ms Milliseconds)

## Example
Some simple [example](#.examples/threads.shen).
