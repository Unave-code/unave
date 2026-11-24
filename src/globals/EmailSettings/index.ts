import type { GlobalAfterReadHook, GlobalConfig } from 'payload'

import { hasAdminRole, isAdmin } from '../../access/isAdmin'
import { isStaff } from '../../access/isStaff'
import { emailLexical } from '../../fields/emailLexical'

const mergeDefaults: GlobalAfterReadHook = ({ doc }) => ({
  ...doc,
  fromAddressDisplay: process.env.MAIL_FROM_ADDRESS ?? '',
  replyToDisplay: process.env.MAIL_REPLY_TO ?? '',
})

export const EmailSettings: GlobalConfig = {
  slug: 'email-settings',
  access: {
    read: isStaff,
    update: isAdmin,
  },
  admin: {
    description:
      'Sender details, the copy for order mail, and the images and extra content customer emails carry. The sender address and reply address come from the server environment.',
    group: 'Settings',
  },
  fields: [
    {
      name: 'orderCopy',
      type: 'group',
      label: 'Order emails',
      admin: {
        description:
          'What the kitchen and the customer are told about a paid order. Leave a field blank to use the built in copy.',
      },
      fields: [
        {
          name: 'confirmationSubject',
          label: 'Customer confirmation subject',
          type: 'text',
        },
        {
          name: 'confirmationIntro',
          label: 'Customer confirmation opening line',
          type: 'textarea',
        },
        {
          name: 'confirmationOutro',
          label: 'Customer confirmation closing line',
          type: 'textarea',
        },
        {
          name: 'kitchenSubject',
          label: 'Kitchen notice subject',
          type: 'text',
        },
        {
          name: 'kitchenIntro',
          label: 'Kitchen notice opening line',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'design',
      type: 'group',
      label: 'Images and extra content',
      admin: {
        description:
          'Images, formatted text and links for the emails. Images are sent as PNG so every inbox can show them; upload them at least 912px wide so they stay sharp. Use the test panel below to send a sample order confirmation and see the result.',
      },
      fields: [
        {
          name: 'headerImage',
          type: 'upload',
          relationTo: 'media',
          label: 'Header image',
          filterOptions: { mimeType: { contains: 'image' } },
          admin: {
            description:
              'A logo or banner at the top of every email: the order confirmation, the kitchen notice and the account emails. Shown up to 456px wide. Fill in its alt text in the media library.',
          },
        },
        {
          name: 'orderContent',
          type: 'richText',
          editor: emailLexical,
          label: 'Extra content in the order confirmation',
          admin: {
            description:
              'Text, images and links shown under the order details in the email the customer gets, for example what happens next or an offer.',
          },
        },
        {
          name: 'footerContent',
          type: 'richText',
          editor: emailLexical,
          label: 'Footer for customer emails',
          admin: {
            description:
              'Shown at the bottom of the order confirmation and the account emails, for example the phone number or social links.',
          },
        },
      ],
    },
    {
      name: 'senderName',
      type: 'text',
      admin: {
        description: 'Overrides MAIL_FROM_NAME when set. Leave blank to use the environment name.',
      },
    },
    {
      name: 'fromAddressDisplay',
      type: 'text',
      access: {
        update: () => false,
      },
      admin: {
        description: 'Read only. Set by MAIL_FROM_ADDRESS.',
        readOnly: true,
      },
      defaultValue: process.env.MAIL_FROM_ADDRESS ?? '',
    },
    {
      name: 'replyToDisplay',
      type: 'text',
      access: {
        update: () => false,
      },
      admin: {
        description: 'Read only. Set by MAIL_REPLY_TO.',
        readOnly: true,
      },
      defaultValue: process.env.MAIL_REPLY_TO ?? '',
    },
    {
      name: 'testPanel',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/EmailTestPanel#EmailTestPanel',
        },
        condition: (_data, _siblingData, { user }) => hasAdminRole(user),
      },
      label: 'Send a test email',
    },
  ],
  hooks: {
    afterRead: [mergeDefaults],
  },
}
