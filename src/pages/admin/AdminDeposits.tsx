// src/pages/admin/AdminDeposits.tsx - UPDATED VERSION
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CardDeposits } from "./CardDeposits";
import { CryptoDeposits } from "./CryptoDeposits";
import { DollarSign } from "lucide-react";

export function AdminDeposits() {
  const [activeTab, setActiveTab] = useState("card");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <DollarSign className="w-6 h-6 text-emerald-500" />
        <h1 className="text-2xl font-bold">Deposits Management</h1>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="card">Card Deposits</TabsTrigger>
          <TabsTrigger value="crypto">Crypto Deposits</TabsTrigger>
        </TabsList>
        
        <TabsContent value="card">
          <CardDeposits />
        </TabsContent>
        
        <TabsContent value="crypto">
          <CryptoDeposits />
        </TabsContent>
      </Tabs>
    </div>
  );
}