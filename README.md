# megapip

Megapip is a minimal wrapper around `pip`. It invokes pip's own command line
interface using its internal API so you can use it as a drop-in replacement.

```bash
megapip install requests
```

This package is a simple demonstration and does not modify pip's behavior. It
simply calls pip's main function with the provided arguments.
