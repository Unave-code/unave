import type { Field } from 'payload'

export const MENU_DAYS = [
  { name: 'mon', label: 'Monday' },
  { name: 'tue', label: 'Tuesday' },
  { name: 'wed', label: 'Wednesday' },
  { name: 'thu', label: 'Thursday' },
  { name: 'fri', label: 'Friday' },
  { name: 'sat', label: 'Saturday' },
] as const

/** A price in paise; the RupeeField shows and takes rupees. */
export const rupeeField = (name: string, label: string, extra: Partial<Field> = {}): Field =>
  ({
    name,
    label,
    type: 'number',
    min: 1,
    admin: {
      width: '33%',
      components: { Field: '@/components/Admin/RupeeField#RupeeField' },
    },
    ...extra,
  }) as Field

/** A week of menu: one fixed breakfast, lunch and dinner per delivery day, text only. Leave a meal empty when the plan does not serve it. */
export const menuWeekField = (name: string, label: string, description: string): Field => ({
  name,
  label,
  type: 'group',
  admin: { description },
  fields: [
    ...MENU_DAYS.map(
      (day): Field => ({
        name: day.name,
        label: day.label,
        type: 'group',
        fields: [
          {
            type: 'row',
            fields: [
              { name: 'breakfastMain', type: 'text', label: 'Breakfast', admin: { width: '33%', placeholder: 'Ragi dosa with tomato chutney' } },
              { name: 'lunchMain', type: 'text', label: 'Lunch', admin: { width: '33%', placeholder: 'Kadhai Paneer with carrot roti' } },
              { name: 'dinnerMain', type: 'text', label: 'Dinner', admin: { width: '33%', placeholder: 'No-Butter Soya Masala with multigrain roti' } },
            ],
          },
          {
            type: 'row',
            fields: [
              { name: 'breakfastSides', type: 'text', label: 'Breakfast sides', admin: { width: '33%', placeholder: 'Sambar, Fruit bowl' } },
              { name: 'lunchSides', type: 'text', label: 'Lunch sides', admin: { width: '33%', placeholder: 'Sprouted moong salad, Matki dal, Capsicum besan subzi' } },
              { name: 'dinnerSides', type: 'text', label: 'Dinner sides', admin: { width: '33%', placeholder: 'Mixed bean salad, Homestyle chole, Aloo gobi' } },
            ],
          },
        ],
      }),
    ),
  ],
})
