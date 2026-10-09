import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  cancelled: "Cancelled",
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/orders");

  // Row level security only returns the user's own orders
  const { data: orders } = await supabase
    .from("orders")
    .select("trade_no, amount, status, created_at, paid_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <h1>My Orders</h1>
      <div className="card">
        {!orders || orders.length === 0 ? (
          <p className="muted">No orders yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order number</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.trade_no}>
                  <td>{order.trade_no}</td>
                  <td>NT${order.amount}</td>
                  <td>{STATUS_LABEL[order.status] ?? order.status}</td>
                  <td>{new Date(order.created_at).toLocaleString("en-US", { timeZone: "Asia/Taipei" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
