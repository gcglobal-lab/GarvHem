export type Testimonial = { quote: string; name: string; role: string; company: string };

/** Real, approved client quotes only. The section stays hidden while this is empty. */
export const testimonials: Testimonial[] = [];
