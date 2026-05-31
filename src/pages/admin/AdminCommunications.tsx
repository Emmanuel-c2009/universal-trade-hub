import { AdminCommunicationCenter } from "@/components/admin/AdminCommunicationCenter";

export default function AdminCommunications() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Communications Center</h1>
        <p className="text-muted-foreground">Send notifications and bulk emails to users</p>
      </div>
      <AdminCommunicationCenter />
    </div>
  );
}