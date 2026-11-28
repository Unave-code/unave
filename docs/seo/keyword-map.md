# UNAVE keyword map and on-page SEO

Source: the owner's keyword map and *Unave AEO and GEO Strategy: Website Structure* (Nov 2026).
One page, one primary query. Copy for each page lives in the module named below; change the words there, not in the page.

| Page | Primary query | Intent | Secondary queries | Copy module |
| --- | --- | --- | --- | --- |
| `/` | cloud kitchen in Chennai | Commercial | online food delivery Chennai, home-style food delivery Chennai, healthy food delivery Chennai | `src/utilities/homeCopy.ts` |
| `/about` | Unave cloud kitchen | Navigational / trust | hygienic cloud kitchen Chennai, FSSAI certified kitchen, homemade food brand Chennai | `src/utilities/aboutCopy.ts` |
| `/products` | buy food products online Chennai | Transactional | fresh food online Chennai, South Indian food products online | `src/utilities/productsCopy.ts` |
| `/products/ready-to-cook` | ready to cook food Chennai | Transactional | dosa batter home delivery Chennai, ready to cook meal kits | `src/utilities/productsCategoryCopy.ts` |
| `/products/fresh-from-produce` | fresh food online Chennai | Transactional | fresh produce delivery Chennai, farm fresh vegetables Chennai, keerai online Chennai, cut vegetables online | `src/utilities/productsCategoryCopy.ts` |
| `/products/ready-to-eat` | ready to eat food Chennai | Transactional | home-style meals delivery Chennai, healthy ready to eat meals, office lunch delivery Chennai, tiffin service Chennai | `src/utilities/productsCategoryCopy.ts` |
| `/delivery-areas` | food delivery areas Chennai | Informational / transactional | cloud kitchen delivery near me, does UNAVE deliver to my area | `src/utilities/deliveryAreaCopy.ts` |
| `/contact` | Unave cloud kitchen contact | Navigational | order food Chennai phone number, cloud kitchen address Chennai | `src/utilities/contactCopy.ts` |

"fresh food online Chennai" is the primary query of `/products/fresh-from-produce` only; `/products` mentions it but must not compete for it.

## What each page carries

- **Title**: the primary query and Chennai. The layout adds `| UNAVE`; a title that already names UNAVE is set `absolute`.
- **H1**: the visible eyebrow sits inside the h1 and carries the query; the brand headline follows it unchanged.
- **Answer paragraph**: directly under the h1, saying what the page offers, from UNAVE, in Chennai.
- **Structured data** (`src/utilities/structuredData.ts`): FoodEstablishment (home, about, contact; contact facts read from the Footer global), WebSite (home), BreadcrumbList (inner pages), FAQPage (home and the three category pages), ItemList (`/products`), AboutPage / ContactPage / CollectionPage.
- **FAQ**: five questions on each category page, written only from facts already on the site.
- **Sitemap**: `/pages-sitemap.xml` now lists the code-built pages (`/`, `/about`, `/our-kitchen`, `/contact`, `/meal-subscription`) as well.
- **`/llms.txt`**: a plain-text guide to the public pages, built from the same copy modules.

## Deliberately not claimed yet (facts needed from the owner)

These secondary queries are not used in the copy, because writing them would mean stating something unconfirmed:

- **FSSAI licence number** → "FSSAI certified kitchen" (about, footer, schema).
- **Delivery timings** → still unconfirmed. Delivery areas are now staff-managed (admin → Website → Delivery areas): `/delivery-areas` lists them with a pincode check, the contact page names them, and schema `areaServed` lists each area, falling back to Chennai while the list is empty.
- **Products sold**: dosa batter and keerai are only named once they are on the shelf.
- **Shelf life and storage** for ready-to-cook and fresh items → FAQ answers.
- **Opening hours, full address, social profile links** → `openingHoursSpecification`, `sameAs`.
- **Founder name and photo** (the about page signs off "Founder, UNAVE").
- **"Organic"**: only with a certificate.

## Off-site (not code)

Google Business Profile, consistent name, address and phone on Justdial, Sulekha, Swiggy and Zomato, review collection, and repeated AI prompt tests. See the strategy document, sections 8 and 11.
