import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Download,
  Eye,
  Filter,
  Search,
  Image,
  File,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Document {
  id: string;
  user_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
  profiles?: { full_name: string; email: string };
}

const documentTypes = [
  { value: "all", label: "All Types" },
  { value: "deposit_receipt", label: "Deposit Receipts" },
  { value: "withdrawal_proof", label: "Withdrawal Proofs" },
  { value: "kyc_document", label: "KYC Documents" },
  { value: "p2p_proof", label: "P2P Payment Proofs" },
  { value: "card_document", label: "Card Documents" },
  { value: "message_attachment", label: "Message Attachments" },
  { value: "other", label: "Other" },
];

export const AdminDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [typeFilter]);

  const fetchDocuments = async () => {
    try {
      let query = supabase
        .from("documents")
        .select(`
          *,
          profiles!documents_user_id_fkey(full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (typeFilter !== "all") {
        query = query.eq("document_type", typeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDocuments(data as Document[]);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      doc.file_name.toLowerCase().includes(search) ||
      doc.profiles?.full_name?.toLowerCase().includes(search) ||
      doc.profiles?.email?.toLowerCase().includes(search) ||
      doc.document_type.toLowerCase().includes(search)
    );
  });

  const getFileIcon = (fileType: string | null) => {
    if (fileType?.startsWith("image/")) {
      return <Image className="w-4 h-4 text-secondary" />;
    }
    return <File className="w-4 h-4 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "deposit_receipt":
        return "bg-emerald-500/20 text-emerald-500";
      case "withdrawal_proof":
        return "bg-amber-500/20 text-amber-500";
      case "kyc_document":
        return "bg-blue-500/20 text-blue-500";
      case "p2p_proof":
        return "bg-purple-500/20 text-purple-500";
      case "card_document":
        return "bg-pink-500/20 text-pink-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const isImageFile = (fileType: string | null) => {
    return fileType?.startsWith("image/");
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-secondary" />
          Documents Vault
        </h1>
        <p className="text-muted-foreground">
          Central repository for all uploaded files across the platform
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {documentTypes.slice(1, 5).map((type) => {
          const count = documents.filter((d) => d.document_type === type.value).length;
          return (
            <Card key={type.value} className="bg-card border-border">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">{type.label}</p>
                <p className="text-2xl font-bold">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by filename, user, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getFileIcon(doc.file_type)}
                      <span className="font-medium truncate max-w-[200px]">
                        {doc.file_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getTypeBadgeColor(doc.document_type)}>
                      {doc.document_type.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{doc.profiles?.full_name || "Unknown"}</p>
                      <p className="text-muted-foreground text-xs">
                        {doc.profiles?.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatFileSize(doc.file_size)}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(doc.created_at), "MMM dd, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {isImageFile(doc.file_type) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setPreviewDoc(doc)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" asChild>
                        <a href={doc.file_url} target="_blank" rel="noopener" download>
                          <Download className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredDocuments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No documents found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewDoc?.file_name}</DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <div className="flex justify-center">
              <img
                src={previewDoc.file_url}
                alt={previewDoc.file_name}
                className="max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
