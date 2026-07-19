Brian Phillips
Invoice Generator – Week 4 Submission

A domain was registered through Namecheap, https://www.instantinvoice.online, and pointed at the existing GitHub Pages deployment. The site is accessible via either of these addresses:

http://www.instantinvoice.online/
https://brainiacly.github.io/InvoiceGenerator/


The core pages are Home, Builder, Print Preview, Account and History, Pricing, About, Sign in, and Sign up. 

The Builder page is organized into five collapsible sections (Business, Customer, Items, Design, Formatting) that open individually or all at once with an Expand all / Collapse all control, instead of one long scrolling form. Each section is built with native HTML details/summary elements, so it stays usable even if JavaScript fails to load.

The Builder supports entering business and customer information, and all invoice date. 

The live preview updates totals instantly as you type. 

Three invoice designs are available: Simple, Modern, and Professional. The design choice carries through to Print Preview.

A full formatting section allows showing or hiding the logo, email, item descriptions, divider lines, and closing note, with the closing note text itself editable. The logo can be moved to any corner and resized. Spacing can be set to Compact, Normal, or Spacious. A watermark can be added using either custom text or an uploaded image, with adjustable transparency, size, and position, movable left/right and up/down rather than fixed to the center. All formatting choices carry through to Print Preview.

Four starter templates are available: Kitchen repair, Weekly service, Landscape work, and Custom invoice. These can be applied directly from the Builder page. An optional logo upload is supported and appears in the invoice preview.

Sign up and Sign in are real, working accounts, local to the browser they are created in. Creating an account hashes the password on-device before storing it, and a live checklist on the Sign up page shows password strength as it is typed; passwords must be at least 8 characters with one uppercase letter, one lowercase letter, one number, and one symbol. Signing in swaps the "Sign in / Sign up" links in the navigation for a Signed in as ___ label and a Sign out button on every page. Invoices created before signing up are moved into the new account automatically.

The History page saves invoices between visits, tied to whichever account is signed in, or to a shared space for anyone browsing without an account. Every saved invoice can be reopened in the Builder, sent to Print Preview, duplicated, or deleted.

Saving an invoice carries it into History and over to the Print Preview page, where Print, Save as PDF (through the browser's print dialog), and Email Draft all work.


The logo and icon images used in this project were generated with ChatGPT and edited for use in assets.
