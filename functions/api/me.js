/* GET /api/me -> the signed-in customer's points, level and saved details. */
import { json, fail, handle, authUser, isGoogleCustomer } from '../_lib/http.js';
import { Firestore } from '../_lib/firestore.js';

export const onRequestGet = handle(async ({ request, env }) => {
  const user = await authUser(request, env);
  if (!isGoogleCustomer(user)) return fail(401, 'login_required');
  const doc = await new Firestore(env).get(`users/${user.uid}`);
  const d = doc ? doc.data : {};
  return json({
    uid: user.uid,
    name: d.name || user.name || '',
    email: user.email || '',
    phone: d.phone || '',
    address: d.address || '',
    points: Number(d.points) || 0,
    lifetimePoints: Number(d.lifetimePoints) || 0
  });
});
