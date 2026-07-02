export interface SeedBook {
  id: number
  slug: string
  title: string
  author: string
  category: string
  price: string
  currency: string
  coverImage: string
  tagline: string
  description: string
  rating: string
  reviewsCount: number
  pages: number
  featured: boolean
  bestseller: boolean
  createdAt: Date
}

export const SEED_BOOKS: SeedBook[] = [
  {
    id: 1,
    slug: 'the-woman-youre-becoming',
    title: "The Woman You're Becoming",
    author: 'Amina Diallo',
    category: 'Mindset & Confidence',
    price: '18000',
    currency: 'NGN',
    coverImage: '/books/the-woman-youre-becoming.png',
    tagline: 'Stop waiting for permission. Start becoming her.',
    description:
      "A powerful guide to shedding self-doubt and stepping into the woman you've always known you could be. Through reflective exercises and transformative practices, Amina Diallo walks you through the journey of unlearning limitations and embracing your authentic power.",
    rating: '4.9',
    reviewsCount: 1247,
    pages: 284,
    featured: true,
    bestseller: true,
    createdAt: new Date('2025-11-01'),
  },
  {
    id: 2,
    slug: 'rise-and-reign',
    title: 'Rise & Reign',
    author: 'Zara Okafor',
    category: 'Leadership',
    price: '22000',
    currency: 'NGN',
    coverImage: '/books/rise-and-reign.png',
    tagline: 'Lead with grace. Rule with grit.',
    description:
      'A masterclass in feminine leadership for the modern woman. Learn how to lead teams, build influence, and create impact without losing your softness. Zara Okafor shares the principles that took her from corporate burnout to becoming one of the most respected voices in African leadership.',
    rating: '4.8',
    reviewsCount: 892,
    pages: 312,
    featured: true,
    bestseller: true,
    createdAt: new Date('2025-09-15'),
  },
  {
    id: 3,
    slug: 'rooted-and-radiant',
    title: 'Rooted & Radiant',
    author: 'Ivy Mensah',
    category: 'Wellness & Self-Care',
    price: '15000',
    currency: 'NGN',
    coverImage: '/books/rooted-and-radiant.png',
    tagline: 'Nourish your body. Ground your spirit.',
    description:
      "A holistic wellness guide that honors the African woman's journey to whole-self health. From ancestral nutrition to modern self-care rituals, Ivy Mensah blends tradition with science to help you feel vibrant, balanced, and deeply alive in your own skin.",
    rating: '4.7',
    reviewsCount: 756,
    pages: 256,
    featured: true,
    bestseller: false,
    createdAt: new Date('2025-07-20'),
  },
  {
    id: 4,
    slug: 'soft-and-sovereign',
    title: 'Soft & Sovereign',
    author: 'Lara Adeyemi',
    category: 'Relationships',
    price: '16000',
    currency: 'NGN',
    coverImage: '/books/soft-and-sovereign.png',
    tagline: 'Keep your softness. Own your power.',
    description:
      "Redefining what it means to be a woman in love, in friendship, and in community. Lara Adeyemi explores the art of setting boundaries, communicating with clarity, and building relationships that honor your sovereignty while keeping your heart open.",
    rating: '4.8',
    reviewsCount: 1023,
    pages: 268,
    featured: true,
    bestseller: false,
    createdAt: new Date('2025-05-10'),
  },
  {
    id: 5,
    slug: 'wealth-her-way',
    title: 'Wealth Her Way',
    author: 'Chioma Eze',
    category: 'Career & Wealth',
    price: '20000',
    currency: 'NGN',
    coverImage: '/books/wealth-her-way.png',
    tagline: 'Build wealth on your own terms.',
    description:
      'A groundbreaking financial guide for women who want to build generational wealth without sacrificing their values. Chioma Eze demystifies investing, business building, and financial independence with actionable strategies tailored for the African woman.',
    rating: '4.9',
    reviewsCount: 1567,
    pages: 330,
    featured: true,
    bestseller: true,
    createdAt: new Date('2026-01-05'),
  },
  {
    id: 6,
    slug: 'the-quiet-power',
    title: 'The Quiet Power',
    author: 'Ngozi Obasi',
    category: 'Spirituality & Purpose',
    price: '14000',
    currency: 'NGN',
    coverImage: '/books/the-quiet-power.png',
    tagline: 'Find your purpose. Walk in your calling.',
    description:
      'For the woman who feels called to something more. Ngozi Obasi takes you on a contemplative journey through scripture, meditation, and reflective practices to discover your unique purpose and develop the spiritual discipline to walk in it daily.',
    rating: '4.8',
    reviewsCount: 678,
    pages: 242,
    featured: true,
    bestseller: false,
    createdAt: new Date('2025-03-01'),
  },
  {
    id: 7,
    slug: 'boundaries-beloved',
    title: 'Boundaries & Beloved',
    author: 'Simi Akintola',
    category: 'Relationships',
    price: '17000',
    currency: 'NGN',
    coverImage: '/books/boundaries-beloved.png',
    tagline: 'Love fully. Protect your peace.',
    description:
      'A transformative guide to mastering the art of boundaries in romantic relationships, friendships, and family dynamics. Simi Akintola teaches you how to love deeply without losing yourself, and how to protect your energy without building walls.',
    rating: '4.7',
    reviewsCount: 534,
    pages: 276,
    featured: false,
    bestseller: false,
    createdAt: new Date('2026-02-14'),
  },
  {
    id: 8,
    slug: 'unshakeable',
    title: 'Unshakeable',
    author: 'Temi Bello',
    category: 'Mindset & Confidence',
    price: '19000',
    currency: 'NGN',
    coverImage: '/books/unshakeable.png',
    tagline: 'Resilience is your superpower.',
    description:
      'In a world that constantly tries to shake you, learn how to stand firm. Temi Bello shares powerful mindset shifts and resilience-building practices that will help you navigate life\'s storms with grace, grit, and unshakeable faith in yourself.',
    rating: '4.6',
    reviewsCount: 412,
    pages: 298,
    featured: false,
    bestseller: false,
    createdAt: new Date('2025-12-01'),
  },
]
