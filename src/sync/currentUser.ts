/** The signed-in user id, set by AuthProvider. Lets data code run outside React. */
let userId: string | null = null;

export const currentUserId = () => userId;
export function setCurrentUserId(id: string | null) {
  userId = id;
}
