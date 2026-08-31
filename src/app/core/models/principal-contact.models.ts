/**
 * GET /api/public/principal-contact — public endpoint (no auth required). 404s until an
 * administrator has been marked as the principal contact via
 * PUT /api/users/authentication/{id}/principal-contact.
 */
export interface PrincipalContactResponse {
  firstName: string;
  lastName: string;
  email: string;
  contactNumber: string;
  /** Digits-only rendering of contactNumber, ready to use in a https://wa.me/{whatsappNumber} link. */
  whatsappNumber: string;
}
