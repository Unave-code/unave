import {
  AlignFeature,
  BoldFeature,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  ItalicFeature,
  LinkFeature,
  OrderedListFeature,
  ParagraphFeature,
  UnderlineFeature,
  UnorderedListFeature,
  UploadFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

/**
 * The editor for content that goes into an email (Settings → Email settings).
 *
 * Only what every inbox can show: paragraphs, two heading levels, bold,
 * italic, underline, links to a web address, lists, a divider, alignment and
 * images from the media library. `src/email/templates/RichContent.tsx` turns
 * each of these into email-safe markup; anything else is never offered, so a
 * staff member cannot build something the email then drops.
 */
export const emailLexical = lexicalEditor({
  features: [
    ParagraphFeature(),
    HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
    BoldFeature(),
    ItalicFeature(),
    UnderlineFeature(),
    LinkFeature({ enabledCollections: [] }),
    UnorderedListFeature(),
    OrderedListFeature(),
    HorizontalRuleFeature(),
    AlignFeature(),
    UploadFeature({ enabledCollections: ['media'] }),
    FixedToolbarFeature(),
  ],
})
