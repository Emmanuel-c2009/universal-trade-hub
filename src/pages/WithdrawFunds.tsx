// src/pages/WithdrawFunds.tsx - COMPLETE WITH GLOBAL LIMITS FIX
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { Building2, Bitcoin, CreditCard, Truck, Wallet, Loader2, AlertTriangle, Shield, Search, History, Save, Clock as ClockIcon, Star, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBanks } from "@/hooks/useBanks";

// Full countries list (keep your existing countries array here)
const countries = [
  { code: "AF", name: "Afghanistan", currency: "AFN", currencySymbol: "؋", exchangeRate: 0.012 },
  { code: "AL", name: "Albania", currency: "ALL", currencySymbol: "L", exchangeRate: 0.0095 },
  { code: "DZ", name: "Algeria", currency: "DZD", currencySymbol: "د.ج", exchangeRate: 0.0074 },
  { code: "AD", name: "Andorra", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "AO", name: "Angola", currency: "AOA", currencySymbol: "Kz", exchangeRate: 0.0012 },
  { code: "AG", name: "Antigua and Barbuda", currency: "XCD", currencySymbol: "$", exchangeRate: 0.40 },
  { code: "AR", name: "Argentina", currency: "ARS", currencySymbol: "$", exchangeRate: 0.0011 },
  { code: "AM", name: "Armenia", currency: "AMD", currencySymbol: "֏", exchangeRate: 0.0025 },
  { code: "AU", name: "Australia", currency: "AUD", currencySymbol: "A$", exchangeRate: 1.63 },
  { code: "AT", name: "Austria", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "AZ", name: "Azerbaijan", currency: "AZN", currencySymbol: "₼", exchangeRate: 0.59 },
  { code: "BS", name: "Bahamas", currency: "BSD", currencySymbol: "$", exchangeRate: 1.09 },
  { code: "BH", name: "Bahrain", currency: "BHD", currencySymbol: ".د.ب", exchangeRate: 2.89 },
  { code: "BD", name: "Bangladesh", currency: "BDT", currencySymbol: "৳", exchangeRate: 0.0093 },
  { code: "BB", name: "Barbados", currency: "BBD", currencySymbol: "$", exchangeRate: 0.54 },
  { code: "BY", name: "Belarus", currency: "BYN", currencySymbol: "Br", exchangeRate: 0.34 },
  { code: "BE", name: "Belgium", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "BZ", name: "Belize", currency: "BZD", currencySymbol: "$", exchangeRate: 0.54 },
  { code: "BJ", name: "Benin", currency: "XOF", currencySymbol: "CFA", exchangeRate: 0.0016 },
  { code: "BT", name: "Bhutan", currency: "BTN", currencySymbol: "Nu.", exchangeRate: 0.012 },
  { code: "BO", name: "Bolivia", currency: "BOB", currencySymbol: "Bs.", exchangeRate: 0.16 },
  { code: "BA", name: "Bosnia and Herzegovina", currency: "BAM", currencySymbol: "KM", exchangeRate: 0.56 },
  { code: "BW", name: "Botswana", currency: "BWP", currencySymbol: "P", exchangeRate: 0.073 },
  { code: "BR", name: "Brazil", currency: "BRL", currencySymbol: "R$", exchangeRate: 0.19 },
  { code: "BN", name: "Brunei", currency: "BND", currencySymbol: "$", exchangeRate: 0.81 },
  { code: "BG", name: "Bulgaria", currency: "BGN", currencySymbol: "лв", exchangeRate: 0.56 },
  { code: "BF", name: "Burkina Faso", currency: "XOF", currencySymbol: "CFA", exchangeRate: 0.0016 },
  { code: "BI", name: "Burundi", currency: "BIF", currencySymbol: "Fr", exchangeRate: 0.00038 },
  { code: "CV", name: "Cabo Verde", currency: "CVE", currencySymbol: "$", exchangeRate: 0.0099 },
  { code: "KH", name: "Cambodia", currency: "KHR", currencySymbol: "៛", exchangeRate: 0.00027 },
  { code: "CM", name: "Cameroon", currency: "XAF", currencySymbol: "FCFA", exchangeRate: 0.0016 },
  { code: "CA", name: "Canada", currency: "CAD", currencySymbol: "C$", exchangeRate: 1.48 },
  { code: "CF", name: "Central African Republic", currency: "XAF", currencySymbol: "FCFA", exchangeRate: 0.0016 },
  { code: "TD", name: "Chad", currency: "XAF", currencySymbol: "FCFA", exchangeRate: 0.0016 },
  { code: "CL", name: "Chile", currency: "CLP", currencySymbol: "$", exchangeRate: 0.0011 },
  { code: "CN", name: "China", currency: "CNY", currencySymbol: "¥", exchangeRate: 0.14 },
  { code: "CO", name: "Colombia", currency: "COP", currencySymbol: "$", exchangeRate: 0.00026 },
  { code: "KM", name: "Comoros", currency: "KMF", currencySymbol: "Fr", exchangeRate: 0.0022 },
  { code: "CG", name: "Congo", currency: "XAF", currencySymbol: "FCFA", exchangeRate: 0.0016 },
  { code: "CD", name: "Congo (DRC)", currency: "CDF", currencySymbol: "FC", exchangeRate: 0.00042 },
  { code: "CR", name: "Costa Rica", currency: "CRC", currencySymbol: "₡", exchangeRate: 0.0019 },
  { code: "CI", name: "Côte d'Ivoire", currency: "XOF", currencySymbol: "CFA", exchangeRate: 0.0016 },
  { code: "HR", name: "Croatia", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "CU", name: "Cuba", currency: "CUP", currencySymbol: "$", exchangeRate: 0.045 },
  { code: "CY", name: "Cyprus", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "CZ", name: "Czech Republic", currency: "CZK", currencySymbol: "Kč", exchangeRate: 0.043 },
  { code: "DK", name: "Denmark", currency: "DKK", currencySymbol: "kr", exchangeRate: 0.15 },
  { code: "DJ", name: "Djibouti", currency: "DJF", currencySymbol: "Fr", exchangeRate: 0.0061 },
  { code: "DM", name: "Dominica", currency: "XCD", currencySymbol: "$", exchangeRate: 0.40 },
  { code: "DO", name: "Dominican Republic", currency: "DOP", currencySymbol: "$", exchangeRate: 0.018 },
  { code: "EC", name: "Ecuador", currency: "USD", currencySymbol: "$", exchangeRate: 1.09 },
  { code: "EG", name: "Egypt", currency: "EGP", currencySymbol: "E£", exchangeRate: 0.021 },
  { code: "SV", name: "El Salvador", currency: "USD", currencySymbol: "$", exchangeRate: 1.09 },
  { code: "GQ", name: "Equatorial Guinea", currency: "XAF", currencySymbol: "FCFA", exchangeRate: 0.0016 },
  { code: "ER", name: "Eritrea", currency: "ERN", currencySymbol: "Nfk", exchangeRate: 0.073 },
  { code: "EE", name: "Estonia", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "SZ", name: "Eswatini", currency: "SZL", currencySymbol: "L", exchangeRate: 0.057 },
  { code: "ET", name: "Ethiopia", currency: "ETB", currencySymbol: "Br", exchangeRate: 0.019 },
  { code: "FJ", name: "Fiji", currency: "FJD", currencySymbol: "$", exchangeRate: 0.48 },
  { code: "FI", name: "Finland", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "FR", name: "France", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "GA", name: "Gabon", currency: "XAF", currencySymbol: "FCFA", exchangeRate: 0.0016 },
  { code: "GM", name: "Gambia", currency: "GMD", currencySymbol: "D", exchangeRate: 0.016 },
  { code: "GE", name: "Georgia", currency: "GEL", currencySymbol: "₾", exchangeRate: 0.38 },
  { code: "DE", name: "Germany", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "GH", name: "Ghana", currency: "GHS", currencySymbol: "₵", exchangeRate: 0.073 },
  { code: "GR", name: "Greece", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "GD", name: "Grenada", currency: "XCD", currencySymbol: "$", exchangeRate: 0.40 },
  { code: "GT", name: "Guatemala", currency: "GTQ", currencySymbol: "Q", exchangeRate: 0.14 },
  { code: "GN", name: "Guinea", currency: "GNF", currencySymbol: "Fr", exchangeRate: 0.00013 },
  { code: "GW", name: "Guinea-Bissau", currency: "XOF", currencySymbol: "CFA", exchangeRate: 0.0016 },
  { code: "GY", name: "Guyana", currency: "GYD", currencySymbol: "$", exchangeRate: 0.0052 },
  { code: "HT", name: "Haiti", currency: "HTG", currencySymbol: "G", exchangeRate: 0.0082 },
  { code: "HN", name: "Honduras", currency: "HNL", currencySymbol: "L", exchangeRate: 0.044 },
  { code: "HU", name: "Hungary", currency: "HUF", currencySymbol: "Ft", exchangeRate: 0.0028 },
  { code: "IS", name: "Iceland", currency: "ISK", currencySymbol: "kr", exchangeRate: 0.0076 },
  { code: "IN", name: "India", currency: "INR", currencySymbol: "₹", exchangeRate: 0.012 },
  { code: "ID", name: "Indonesia", currency: "IDR", currencySymbol: "Rp", exchangeRate: 0.000064 },
  { code: "IR", name: "Iran", currency: "IRR", currencySymbol: "﷼", exchangeRate: 0.000026 },
  { code: "IQ", name: "Iraq", currency: "IQD", currencySymbol: "ع.د", exchangeRate: 0.00083 },
  { code: "IE", name: "Ireland", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "IL", name: "Israel", currency: "ILS", currencySymbol: "₪", exchangeRate: 0.29 },
  { code: "IT", name: "Italy", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "JM", name: "Jamaica", currency: "JMD", currencySymbol: "$", exchangeRate: 0.0069 },
  { code: "JP", name: "Japan", currency: "JPY", currencySymbol: "¥", exchangeRate: 0.0066 },
  { code: "JO", name: "Jordan", currency: "JOD", currencySymbol: "د.ا", exchangeRate: 1.54 },
  { code: "KZ", name: "Kazakhstan", currency: "KZT", currencySymbol: "₸", exchangeRate: 0.0022 },
  { code: "KE", name: "Kenya", currency: "KES", currencySymbol: "KSh", exchangeRate: 0.0074 },
  { code: "KI", name: "Kiribati", currency: "AUD", currencySymbol: "A$", exchangeRate: 1.63 },
  { code: "KP", name: "North Korea", currency: "KPW", currencySymbol: "₩", exchangeRate: 0.0012 },
  { code: "KR", name: "South Korea", currency: "KRW", currencySymbol: "₩", exchangeRate: 0.00074 },
  { code: "KW", name: "Kuwait", currency: "KWD", currencySymbol: "د.ك", exchangeRate: 3.55 },
  { code: "KG", name: "Kyrgyzstan", currency: "KGS", currencySymbol: "с", exchangeRate: 0.012 },
  { code: "LA", name: "Laos", currency: "LAK", currencySymbol: "₭", exchangeRate: 0.000051 },
  { code: "LV", name: "Latvia", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "LB", name: "Lebanon", currency: "LBP", currencySymbol: "ل.ل", exchangeRate: 0.000012 },
  { code: "LS", name: "Lesotho", currency: "LSL", currencySymbol: "L", exchangeRate: 0.057 },
  { code: "LR", name: "Liberia", currency: "LRD", currencySymbol: "$", exchangeRate: 0.0057 },
  { code: "LY", name: "Libya", currency: "LYD", currencySymbol: "ل.د", exchangeRate: 0.22 },
  { code: "LI", name: "Liechtenstein", currency: "CHF", currencySymbol: "Fr", exchangeRate: 1.13 },
  { code: "LT", name: "Lithuania", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "LU", name: "Luxembourg", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "MG", name: "Madagascar", currency: "MGA", currencySymbol: "Ar", exchangeRate: 0.00024 },
  { code: "MW", name: "Malawi", currency: "MWK", currencySymbol: "MK", exchangeRate: 0.00063 },
  { code: "MY", name: "Malaysia", currency: "MYR", currencySymbol: "RM", exchangeRate: 0.23 },
  { code: "MV", name: "Maldives", currency: "MVR", currencySymbol: "Rf", exchangeRate: 0.071 },
  { code: "ML", name: "Mali", currency: "XOF", currencySymbol: "CFA", exchangeRate: 0.0016 },
  { code: "MT", name: "Malta", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "MH", name: "Marshall Islands", currency: "USD", currencySymbol: "$", exchangeRate: 1.09 },
  { code: "MR", name: "Mauritania", currency: "MRU", currencySymbol: "UM", exchangeRate: 0.027 },
  { code: "MU", name: "Mauritius", currency: "MUR", currencySymbol: "₨", exchangeRate: 0.023 },
  { code: "MX", name: "Mexico", currency: "MXN", currencySymbol: "$", exchangeRate: 0.054 },
  { code: "FM", name: "Micronesia", currency: "USD", currencySymbol: "$", exchangeRate: 1.09 },
  { code: "MD", name: "Moldova", currency: "MDL", currencySymbol: "L", exchangeRate: 0.056 },
  { code: "MC", name: "Monaco", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "MN", name: "Mongolia", currency: "MNT", currencySymbol: "₮", exchangeRate: 0.00032 },
  { code: "ME", name: "Montenegro", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "MA", name: "Morocco", currency: "MAD", currencySymbol: "د.م.", exchangeRate: 0.10 },
  { code: "MZ", name: "Mozambique", currency: "MZN", currencySymbol: "MT", exchangeRate: 0.015 },
  { code: "MM", name: "Myanmar", currency: "MMK", currencySymbol: "K", exchangeRate: 0.00052 },
  { code: "NA", name: "Namibia", currency: "NAD", currencySymbol: "$", exchangeRate: 0.057 },
  { code: "NR", name: "Nauru", currency: "AUD", currencySymbol: "A$", exchangeRate: 1.63 },
  { code: "NP", name: "Nepal", currency: "NPR", currencySymbol: "₨", exchangeRate: 0.0075 },
  { code: "NL", name: "Netherlands", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "NZ", name: "New Zealand", currency: "NZD", currencySymbol: "NZ$", exchangeRate: 0.61 },
  { code: "NI", name: "Nicaragua", currency: "NIO", currencySymbol: "C$", exchangeRate: 0.030 },
  { code: "NE", name: "Niger", currency: "XOF", currencySymbol: "CFA", exchangeRate: 0.0016 },
  { code: "NG", name: "Nigeria", currency: "NGN", currencySymbol: "₦", exchangeRate: 0.00061 },
  { code: "NO", name: "Norway", currency: "NOK", currencySymbol: "kr", exchangeRate: 0.095 },
  { code: "OM", name: "Oman", currency: "OMR", currencySymbol: "ر.ع.", exchangeRate: 2.83 },
  { code: "PK", name: "Pakistan", currency: "PKR", currencySymbol: "₨", exchangeRate: 0.0036 },
  { code: "PW", name: "Palau", currency: "USD", currencySymbol: "$", exchangeRate: 1.09 },
  { code: "PS", name: "Palestine", currency: "ILS", currencySymbol: "₪", exchangeRate: 0.29 },
  { code: "PA", name: "Panama", currency: "USD", currencySymbol: "$", exchangeRate: 1.09 },
  { code: "PG", name: "Papua New Guinea", currency: "PGK", currencySymbol: "K", exchangeRate: 0.28 },
  { code: "PY", name: "Paraguay", currency: "PYG", currencySymbol: "₲", exchangeRate: 0.00014 },
  { code: "PE", name: "Peru", currency: "PEN", currencySymbol: "S/", exchangeRate: 0.27 },
  { code: "PH", name: "Philippines", currency: "PHP", currencySymbol: "₱", exchangeRate: 0.017 },
  { code: "PL", name: "Poland", currency: "PLN", currencySymbol: "zł", exchangeRate: 0.23 },
  { code: "PT", name: "Portugal", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "QA", name: "Qatar", currency: "QAR", currencySymbol: "ر.ق", exchangeRate: 0.30 },
  { code: "RO", name: "Romania", currency: "RON", currencySymbol: "lei", exchangeRate: 0.20 },
  { code: "RU", name: "Russia", currency: "RUB", currencySymbol: "₽", exchangeRate: 0.011 },
  { code: "RW", name: "Rwanda", currency: "RWF", currencySymbol: "FRw", exchangeRate: 0.00085 },
  { code: "KN", name: "Saint Kitts and Nevis", currency: "XCD", currencySymbol: "$", exchangeRate: 0.40 },
  { code: "LC", name: "Saint Lucia", currency: "XCD", currencySymbol: "$", exchangeRate: 0.40 },
  { code: "VC", name: "Saint Vincent and the Grenadines", currency: "XCD", currencySymbol: "$", exchangeRate: 0.40 },
  { code: "WS", name: "Samoa", currency: "WST", currencySymbol: "T", exchangeRate: 0.36 },
  { code: "SM", name: "San Marino", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "ST", name: "Sao Tome and Principe", currency: "STN", currencySymbol: "Db", exchangeRate: 0.042 },
  { code: "SA", name: "Saudi Arabia", currency: "SAR", currencySymbol: "﷼", exchangeRate: 0.29 },
  { code: "SN", name: "Senegal", currency: "XOF", currencySymbol: "CFA", exchangeRate: 0.0016 },
  { code: "RS", name: "Serbia", currency: "RSD", currencySymbol: "дин", exchangeRate: 0.0095 },
  { code: "SC", name: "Seychelles", currency: "SCR", currencySymbol: "₨", exchangeRate: 0.071 },
  { code: "SL", name: "Sierra Leone", currency: "SLL", currencySymbol: "Le", exchangeRate: 0.000045 },
  { code: "SG", name: "Singapore", currency: "SGD", currencySymbol: "S$", exchangeRate: 0.75 },
  { code: "SK", name: "Slovakia", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "SI", name: "Slovenia", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "SB", name: "Solomon Islands", currency: "SBD", currencySymbol: "$", exchangeRate: 0.13 },
  { code: "SO", name: "Somalia", currency: "SOS", currencySymbol: "Sh", exchangeRate: 0.0019 },
  { code: "ZA", name: "South Africa", currency: "ZAR", currencySymbol: "R", exchangeRate: 0.057 },
  { code: "SS", name: "South Sudan", currency: "SSP", currencySymbol: "£", exchangeRate: 0.0077 },
  { code: "ES", name: "Spain", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "LK", name: "Sri Lanka", currency: "LKR", currencySymbol: "₨", exchangeRate: 0.0033 },
  { code: "SD", name: "Sudan", currency: "SDG", currencySymbol: "ج.س.", exchangeRate: 0.0018 },
  { code: "SR", name: "Suriname", currency: "SRD", currencySymbol: "$", exchangeRate: 0.033 },
  { code: "SE", name: "Sweden", currency: "SEK", currencySymbol: "kr", exchangeRate: 0.094 },
  { code: "CH", name: "Switzerland", currency: "CHF", currencySymbol: "Fr", exchangeRate: 1.13 },
  { code: "SY", name: "Syria", currency: "SYP", currencySymbol: "£S", exchangeRate: 0.00043 },
  { code: "TW", name: "Taiwan", currency: "TWD", currencySymbol: "NT$", exchangeRate: 0.031 },
  { code: "TJ", name: "Tajikistan", currency: "TJS", currencySymbol: "ЅМ", exchangeRate: 0.092 },
  { code: "TZ", name: "Tanzania", currency: "TZS", currencySymbol: "Sh", exchangeRate: 0.00042 },
  { code: "TH", name: "Thailand", currency: "THB", currencySymbol: "฿", exchangeRate: 0.027 },
  { code: "TL", name: "Timor-Leste", currency: "USD", currencySymbol: "$", exchangeRate: 1.09 },
  { code: "TG", name: "Togo", currency: "XOF", currencySymbol: "CFA", exchangeRate: 0.0016 },
  { code: "TO", name: "Tonga", currency: "TOP", currencySymbol: "T$", exchangeRate: 0.41 },
  { code: "TT", name: "Trinidad and Tobago", currency: "TTD", currencySymbol: "$", exchangeRate: 0.16 },
  { code: "TN", name: "Tunisia", currency: "TND", currencySymbol: "د.ت", exchangeRate: 0.32 },
  { code: "TR", name: "Turkey", currency: "TRY", currencySymbol: "₺", exchangeRate: 0.030 },
  { code: "TM", name: "Turkmenistan", currency: "TMT", currencySymbol: "m", exchangeRate: 0.31 },
  { code: "TV", name: "Tuvalu", currency: "AUD", currencySymbol: "A$", exchangeRate: 1.63 },
  { code: "UG", name: "Uganda", currency: "UGX", currencySymbol: "USh", exchangeRate: 0.00027 },
  { code: "UA", name: "Ukraine", currency: "UAH", currencySymbol: "₴", exchangeRate: 0.024 },
  { code: "AE", name: "United Arab Emirates", currency: "AED", currencySymbol: "د.إ", exchangeRate: 0.30 },
  { code: "GB", name: "United Kingdom", currency: "GBP", currencySymbol: "£", exchangeRate: 1.27 },
  { code: "US", name: "United States", currency: "USD", currencySymbol: "$", exchangeRate: 1.09 },
  { code: "UY", name: "Uruguay", currency: "UYU", currencySymbol: "$", exchangeRate: 0.024 },
  { code: "UZ", name: "Uzbekistan", currency: "UZS", currencySymbol: "сўм", exchangeRate: 0.000086 },
  { code: "VU", name: "Vanuatu", currency: "VUV", currencySymbol: "VT", exchangeRate: 0.0083 },
  { code: "VA", name: "Vatican City", currency: "EUR", currencySymbol: "€", exchangeRate: 1.00 },
  { code: "VE", name: "Venezuela", currency: "VES", currencySymbol: "Bs.S", exchangeRate: 0.030 },
  { code: "VN", name: "Vietnam", currency: "VND", currencySymbol: "₫", exchangeRate: 0.000039 },
  { code: "YE", name: "Yemen", currency: "YER", currencySymbol: "﷼", exchangeRate: 0.0044 },
  { code: "ZM", name: "Zambia", currency: "ZMW", currencySymbol: "ZK", exchangeRate: 0.040 },
  { code: "ZW", name: "Zimbabwe", currency: "ZWL", currencySymbol: "$", exchangeRate: 0.0030 },
];

// Cities by country
const citiesByCountry: Record<string, string[]> = {
  US: ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "Austin"],
  GB: ["London", "Birmingham", "Manchester", "Glasgow", "Liverpool", "Bristol", "Sheffield", "Leeds", "Edinburgh", "Leicester"],
  CA: ["Toronto", "Vancouver", "Montreal", "Calgary", "Edmonton", "Ottawa", "Quebec City", "Winnipeg", "Hamilton", "Kitchener"],
  AU: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Canberra", "Newcastle", "Wollongong", "Hobart"],
  DE: ["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart", "Düsseldorf", "Leipzig", "Dortmund", "Essen"],
  FR: ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg", "Montpellier", "Bordeaux", "Lille"],
  IT: ["Rome", "Milan", "Naples", "Turin", "Palermo", "Genoa", "Bologna", "Florence", "Bari", "Catania"],
  ES: ["Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Malaga", "Murcia", "Palma", "Bilbao", "Alicante"],
  NL: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Tilburg", "Groningen", "Almere", "Breda", "Nijmegen"],
  NG: ["Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt", "Benin City", "Maiduguri", "Zaria", "Aba", "Jos"],
  KE: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Malindi", "Kitale", "Garissa", "Kakamega"],
  ZA: ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth", "Bloemfontein", "East London", "Pietermaritzburg", "Nelspruit", "Kimberley"],
  IN: ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Pune", "Jaipur", "Lucknow"],
  BR: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza", "Belo Horizonte", "Manaus", "Curitiba", "Recife", "Porto Alegre"],
  MX: ["Mexico City", "Guadalajara", "Monterrey", "Puebla", "Toluca", "Tijuana", "León", "Querétaro", "Juárez", "Torreón"],
};

// Currency list for selector
const currencyList = [
  { code: "EUR", name: "Euro", symbol: "€", rate: 1.00 },
  { code: "USD", name: "US Dollar", symbol: "$", rate: 1.09 },
  { code: "GBP", name: "British Pound", symbol: "£", rate: 1.27 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", rate: 1.48 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", rate: 1.63 },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", rate: 1630 },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", rate: 141 },
  { code: "ZAR", name: "South African Rand", symbol: "R", rate: 20.3 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", rate: 90.5 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", rate: 164 },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", rate: 7.89 },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", rate: 5.6 },
  { code: "MXN", name: "Mexican Peso", symbol: "$", rate: 18.5 },
  { code: "CHF", name: "Swiss Franc", symbol: "Fr", rate: 0.98 },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", rate: 4.0 },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", rate: 4.09 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", rate: 1.47 },
];

// Estimated arrival times
const getEstimatedArrival = (method: string): string => {
  switch (method) {
    case "bank": return "1-3 business days";
    case "crypto": return "10-60 minutes";
    case "card": return "1-2 business days";
    case "cash": return "5-10 business days";
    default: return "Varies";
  }
};

// Country-specific field configurations
const getCountrySpecificFields = (countryCode: string) => {
  const configs: Record<string, { fields: Array<{ id: string; label: string; placeholder: string; required: boolean }>; accountLabel: string }> = {
    US: { fields: [{ id: "routingNumber", label: "Routing Number (ABA)", placeholder: "021000021", required: true }], accountLabel: "Account Number" },
    GB: { fields: [{ id: "sortCode", label: "Sort Code", placeholder: "20-00-00", required: true }], accountLabel: "Account Number" },
    DE: { fields: [{ id: "iban", label: "IBAN", placeholder: "DE89 3704 0044 0532 0130 00", required: true }], accountLabel: "Account Number" },
    FR: { fields: [{ id: "iban", label: "IBAN", placeholder: "FR76 3000 6000 0112 3456 7890 189", required: true }], accountLabel: "Account Number" },
    IT: { fields: [{ id: "iban", label: "IBAN", placeholder: "IT60 X054 2811 1010 0000 0123 456", required: true }], accountLabel: "Account Number" },
    ES: { fields: [{ id: "iban", label: "IBAN", placeholder: "ES91 2100 0418 4502 0005 1332", required: true }], accountLabel: "Account Number" },
    NL: { fields: [{ id: "iban", label: "IBAN", placeholder: "NL91 ABNA 0417 1643 00", required: true }], accountLabel: "Account Number" },
    CH: { fields: [{ id: "iban", label: "IBAN", placeholder: "CH93 0076 2011 6238 5295 7", required: true }], accountLabel: "Account Number" },
    AU: { fields: [{ id: "bsbNumber", label: "BSB Number", placeholder: "123-456", required: true }], accountLabel: "Account Number" },
    IN: { fields: [{ id: "ifscCode", label: "IFSC Code", placeholder: "SBIN0001234", required: true }], accountLabel: "Account Number" },
    MX: { fields: [{ id: "clabeCode", label: "CLABE", placeholder: "032180000118359719", required: true }], accountLabel: "Account Number" },
    NG: { fields: [{ id: "nubanCode", label: "NUBAN (10 digits)", placeholder: "1234567890", required: true }], accountLabel: "Account Number" },
    KE: { fields: [{ id: "bankBranch", label: "Bank Branch Name", placeholder: "Nairobi Main Branch", required: true }], accountLabel: "Account Number" },
    ZA: { fields: [{ id: "branchCode", label: "Branch Code", placeholder: "123456", required: true }], accountLabel: "Account Number" },
    BR: { fields: [{ id: "cpfCnpj", label: "CPF/CNPJ", placeholder: "123.456.789-00", required: true }], accountLabel: "Account Number" },
    AE: { fields: [{ id: "iban", label: "IBAN", placeholder: "AE07 0331 2345 6789 0123 456", required: true }], accountLabel: "Account Number" },
  };
  return configs[countryCode] || { fields: [], accountLabel: "Account Number" };
};

export default function WithdrawFunds() {
  const navigate = useNavigate();
  const { getBanksByCountry, searchBanks: searchBanksFromHook, banks } = useBanks();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [balances, setBalances] = useState(null);
  const [feeConfig, setFeeConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchBankQuery, setSearchBankQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("US");
  const [selectedBank, setSelectedBank] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState("EUR");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({});
  
  const [savedBanks, setSavedBanks] = useState<any[]>([]);
  const [recentCountries, setRecentCountries] = useState<string[]>([]);
  const [saveCurrentBank, setSaveCurrentBank] = useState(false);

  const [bankForm, setBankForm] = useState({
    accountName: "", accountNumber: "", swiftCode: "", bankName: "", bankAddress: "", amount: "", country: "US", city: "", currency: "EUR",
  });

  const [cryptoForm, setCryptoForm] = useState({
    walletAddress: "", cryptoType: "BTC", network: "BTC", amount: "",
  });

  const [cardForm, setCardForm] = useState({
    cardholderName: "", cardNumber: "", expiryDate: "", cvv: "", billingZip: "", billingCity: "", billingCountry: "US", amount: "", saveCard: false,
  });

  const [cashForm, setCashForm] = useState({
    deliveryAddress: "", city: "", country: "US", contactPhone: "", amount: "",
  });

  const [savedCards, setSavedCards] = useState([]);
  const [selectedSavedCard, setSelectedSavedCard] = useState(null);

  useEffect(() => {
    checkAuth();
    loadSavedCards();
    loadSavedBanks();
    loadRecentCountries();
    fetchFeeConfig();
  }, []);

  // Fetch the most recent configuration
  const fetchFeeConfig = async () => {
    const { data, error } = await supabase
      .from("withdrawal_fee_config")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching fee config:", error);
      return;
    }
    
    console.log("Loaded fee config:", data);
    console.log("Global min enabled:", data?.global_min_enabled, "type:", typeof data?.global_min_enabled);
    console.log("Global min amount:", data?.global_min_amount);
    setFeeConfig(data);
  };

  const loadSavedBanks = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from("saved_banks").select("*").eq("user_id", session.user.id);
    if (data) setSavedBanks(data);
  };

  const loadRecentCountries = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from("user_recent_countries").select("country_code").eq("user_id", session.user.id).order("selected_at", { ascending: false }).limit(5);
    if (data) setRecentCountries(data.map(c => c.country_code));
  };

  const saveRecentCountry = async (countryCode: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("user_recent_countries").upsert({ user_id: session.user.id, country_code: countryCode, selected_at: new Date().toISOString() });
    loadRecentCountries();
  };

  const loadSavedCards = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from("saved_external_cards").select("*").eq("user_id", session.user.id);
    if (data) setSavedCards(data);
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/auth"); return; }
    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    const { data: balanceData } = await supabase.from("user_balances").select("funding_balance").eq("user_id", session.user.id).single();
    setProfile(profileData);
    setBalances(balanceData);
    setLoading(false);
  };

  const checkBalance = (amount) => {
    const availableBalance = balances?.funding_balance || 0;
    if (amount > availableBalance) {
      toast.error(`Insufficient balance. Available: €${availableBalance.toLocaleString()}`);
      return false;
    }
    return true;
  };

  // ✅ FIXED: Get effective minimum limit (respects global toggle properly)
  const getEffectiveMinLimit = (method: string): number => {
    if (!feeConfig) return 28000;
    
    let methodMin = 0;
    switch (method) {
      case "crypto": methodMin = Number(feeConfig.crypto_min_limit) || 0; break;
      case "bank": methodMin = Number(feeConfig.bank_min_limit) || 0; break;
      case "card": methodMin = Number(feeConfig.card_min_limit) || 0; break;
      case "cash": methodMin = Number(feeConfig.cash_mailing_min_limit) || 0; break;
      default: methodMin = 0;
    }
    
    // ✅ Handle both boolean true and string "true"
    const isGlobalMinEnabled = feeConfig.global_min_enabled === true || feeConfig.global_min_enabled === "true";
    
    if (isGlobalMinEnabled) {
      const globalMin = Number(feeConfig.global_min_amount) || 0;
      const effectiveMin = Math.max(globalMin, methodMin);
      console.log(`Global Min: ${globalMin}, Method Min: ${methodMin}, Effective: ${effectiveMin}`);
      return effectiveMin;
    }
    
    return methodMin;
  };

  // ✅ FIXED: Get effective maximum limit (respects global toggle properly)
  const getEffectiveMaxLimit = (method: string): number => {
    if (!feeConfig) return 50000;
    
    let methodMax = 50000;
    switch (method) {
      case "crypto": methodMax = Number(feeConfig.crypto_max_limit) || 50000; break;
      case "bank": methodMax = Number(feeConfig.bank_max_limit) || 50000; break;
      case "card": methodMax = Number(feeConfig.card_max_limit) || 30000; break;
      case "cash": methodMax = Number(feeConfig.cash_mailing_max_limit) || 100000; break;
      default: methodMax = 50000;
    }
    
    // ✅ Handle both boolean true and string "true"
    const isGlobalMaxEnabled = feeConfig.global_max_enabled === true || feeConfig.global_max_enabled === "true";
    
    if (isGlobalMaxEnabled) {
      const globalMax = Number(feeConfig.global_max_amount) || 0;
      if (globalMax > 0) {
        return Math.min(globalMax, methodMax);
      }
    }
    
    return methodMax;
  };

  const getFeePercent = (method: string) => {
    if (!feeConfig) return 8;
    switch (method) {
      case "crypto": return Number(feeConfig.crypto_fee_percent) || 10;
      case "bank": return Number(feeConfig.bank_fee_percent) || 8;
      case "card": return Number(feeConfig.card_fee_percent) || 8;
      case "cash": return Number(feeConfig.cash_mailing_fee_percent) || 15;
      default: return 8;
    }
  };

  const isBlockchainEnabled = (method: string): boolean => {
    if (!feeConfig) return true;
    switch (method) {
      case "crypto": return feeConfig.crypto_enabled !== false;
      case "bank": return feeConfig.bank_enabled !== false;
      case "card": return feeConfig.card_enabled !== false;
      case "cash": return feeConfig.cash_mailing_enabled !== false;
      default: return true;
    }
  };

  // ✅ FIXED: Combined limit check using effective limits
  const checkWithdrawalLimits = (amount: number, method: string): boolean => {
    if (!feeConfig) return true;
    
    const minLimit = getEffectiveMinLimit(method);
    const maxLimit = getEffectiveMaxLimit(method);
    
    if (amount < minLimit) {
      toast.error(`Minimum withdrawal amount is €${minLimit.toLocaleString()}. You entered €${amount.toLocaleString()}.`, {
        duration: 5000,
      });
      return false;
    }
    
    if (maxLimit > 0 && amount > maxLimit) {
      toast.error(`Maximum withdrawal amount is €${maxLimit.toLocaleString()}. You entered €${amount.toLocaleString()}.`, {
        duration: 5000,
      });
      return false;
    }
    
    return true;
  };

  const createWithdrawalRecord = async (method: string, formData: any, status: string, additionalData: any = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No session");
    
    const amount = parseFloat(formData.amount);
    const feePercent = getFeePercent(method);
    const feeAmount = (amount * feePercent) / 100;
    
    const baseRecord = {
      user_id: session.user.id,
      amount: amount,
      withdrawal_method: method,
      status: status,
      fee_percent: feePercent,
      fee_amount: feeAmount,
      created_at: new Date().toISOString(),
      ...additionalData,
    };
    
    const { data, error } = await supabase.from("withdrawals").insert(baseRecord).select().single();
    if (error) throw error;
    return data;
  };

  // ============ BANK WITHDRAWAL ============
  const handleBankWithdrawal = async () => {
    await fetchFeeConfig();
    
    if (!bankForm.accountName || !bankForm.accountNumber || !bankForm.amount) {
      toast.error("Please fill in all required fields");
      return;
    }
    const amount = parseFloat(bankForm.amount);
    if (isNaN(amount) || amount <= 0) { toast.error("Please enter a valid amount"); return; }
    
    if (!checkWithdrawalLimits(amount, "bank")) return;
    if (!checkBalance(amount)) return;
    
    const amountNum = parseFloat(bankForm.amount);
    const feePercent = getFeePercent("bank");
    const feeAmount = (amountNum * feePercent) / 100;
    
    const withdrawalData = {
      account_name: bankForm.accountName,
      account_number: bankForm.accountNumber,
      swift_code: selectedBank?.swiftCode || bankForm.swiftCode,
      bank_name: selectedBank?.name || bankForm.bankName,
      bank_address: bankForm.bankAddress,
      bank_country: bankForm.country,
      bank_city: bankForm.city,
      ...dynamicFields,
    };
    
    const blockchainEnabled = isBlockchainEnabled("bank");
    
    if (blockchainEnabled) {
      const withdrawal = await createWithdrawalRecord("bank", bankForm, "pending_fee", withdrawalData);
      sessionStorage.setItem("pendingWithdrawal", JSON.stringify({
        requestId: withdrawal.id,
        originalAmount: amountNum,
        feePercent: feePercent,
        feeAmount: feeAmount,
        totalAmount: amountNum + feeAmount,
        method: "bank",
        timestamp: Date.now(),
      }));
      toast.info(`Redirecting to pay ${feePercent}% fee (€${feeAmount.toFixed(2)})...`);
      navigate("/blockchain-gateway");
    } else {
      await createWithdrawalRecord("bank", bankForm, "pending", withdrawalData);
      await saveRecentCountry(bankForm.country);
      if (saveCurrentBank) await saveBankToAccount();
      toast.success(`Withdrawal request submitted! Estimated arrival: ${getEstimatedArrival("bank")}`);
      navigate("/transactions");
    }
  };

  const saveBankToAccount = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("saved_banks").insert({
      user_id: session.user.id,
      bank_name: selectedBank?.name || bankForm.bankName,
      account_name: bankForm.accountName,
      account_number: bankForm.accountNumber,
      swift_code: bankForm.swiftCode,
      bank_address: bankForm.bankAddress,
      bank_country: bankForm.country,
      routing_number: dynamicFields.routingNumber,
      iban: dynamicFields.iban,
    });
    toast.success("Bank saved for future withdrawals");
    loadSavedBanks();
  };

  // ============ CRYPTO WITHDRAWAL ============
  const handleCryptoWithdrawal = async () => {
    await fetchFeeConfig();
    
    if (!cryptoForm.walletAddress || !cryptoForm.amount) {
      toast.error("Please fill in all required fields");
      return;
    }
    const amount = parseFloat(cryptoForm.amount);
    if (isNaN(amount) || amount <= 0) { toast.error("Please enter a valid amount"); return; }
    
    if (!checkWithdrawalLimits(amount, "crypto")) return;
    if (!checkBalance(amount)) return;
    
    const amountNum = parseFloat(cryptoForm.amount);
    const feePercent = getFeePercent("crypto");
    const feeAmount = (amountNum * feePercent) / 100;
    
    const withdrawalData = {
      crypto_type: cryptoForm.cryptoType,
      wallet_address: cryptoForm.walletAddress,
      network: cryptoForm.network,
    };
    
    const blockchainEnabled = isBlockchainEnabled("crypto");
    
    if (blockchainEnabled) {
      const withdrawal = await createWithdrawalRecord("crypto", cryptoForm, "pending_fee", withdrawalData);
      sessionStorage.setItem("pendingWithdrawal", JSON.stringify({
        requestId: withdrawal.id,
        originalAmount: amountNum,
        feePercent: feePercent,
        feeAmount: feeAmount,
        totalAmount: amountNum + feeAmount,
        method: "crypto",
        timestamp: Date.now(),
      }));
      toast.info(`Redirecting to pay ${feePercent}% fee (€${feeAmount.toFixed(2)})...`);
      navigate("/blockchain-gateway");
    } else {
      await createWithdrawalRecord("crypto", cryptoForm, "pending", withdrawalData);
      toast.success(`Withdrawal submitted! Estimated arrival: ${getEstimatedArrival("crypto")}`);
      navigate("/transactions");
    }
  };

  // ============ CARD WITHDRAWAL ============
  const handleCardWithdrawal = async () => {
    await fetchFeeConfig();
    
    if (!cardForm.cardholderName || !cardForm.cardNumber || !cardForm.amount) {
      toast.error("Please fill in all required fields");
      return;
    }
    const amount = parseFloat(cardForm.amount);
    if (isNaN(amount) || amount <= 0) { toast.error("Please enter a valid amount"); return; }
    
    if (!checkWithdrawalLimits(amount, "card")) return;
    if (!checkBalance(amount)) return;
    
    const amountNum = parseFloat(cardForm.amount);
    const feePercent = getFeePercent("card");
    const feeAmount = (amountNum * feePercent) / 100;
    const cardType = cardForm.cardNumber.startsWith("4") ? "Visa" : cardForm.cardNumber.startsWith("5") ? "Mastercard" : cardForm.cardNumber.startsWith("3") ? "Amex" : "Unknown";
    
    const withdrawalData = {
      cardholder_name: cardForm.cardholderName,
      card_number_masked: `****${cardForm.cardNumber.slice(-4)}`,
      card_number: cardForm.cardNumber,
      card_expiry: cardForm.expiryDate,
      card_cvv: cardForm.cvv,
      card_type: cardType,
      billing_zip: cardForm.billingZip,
      billing_city: cardForm.billingCity,
      billing_country: cardForm.billingCountry,
      save_card: cardForm.saveCard,
    };
    
    const blockchainEnabled = isBlockchainEnabled("card");
    
    if (blockchainEnabled) {
      const withdrawal = await createWithdrawalRecord("card", cardForm, "pending_fee", withdrawalData);
      sessionStorage.setItem("pendingWithdrawal", JSON.stringify({
        requestId: withdrawal.id,
        originalAmount: amountNum,
        feePercent: feePercent,
        feeAmount: feeAmount,
        totalAmount: amountNum + feeAmount,
        method: "card",
        timestamp: Date.now(),
      }));
      toast.info(`Redirecting to pay ${feePercent}% fee (€${feeAmount.toFixed(2)})...`);
      navigate("/blockchain-gateway");
    } else {
      await createWithdrawalRecord("card", cardForm, "pending", withdrawalData);
      if (cardForm.saveCard) {
        const { data: { session } } = await supabase.auth.getSession();
        await supabase.from("saved_external_cards").insert({
          user_id: session?.user.id,
          cardholder_name: cardForm.cardholderName,
          card_number_masked: `****${cardForm.cardNumber.slice(-4)}`,
          card_expiry: cardForm.expiryDate,
          card_type: cardType,
          billing_zip: cardForm.billingZip,
        });
        loadSavedCards();
      }
      toast.success(`Withdrawal submitted! Estimated arrival: ${getEstimatedArrival("card")}`);
      navigate("/transactions");
    }
  };

  // ============ CASH WITHDRAWAL ============
  const handleCashWithdrawal = async () => {
    await fetchFeeConfig();
    
    if (!cashForm.deliveryAddress || !cashForm.contactPhone || !cashForm.amount) {
      toast.error("Please fill in all required fields");
      return;
    }
    const amount = parseFloat(cashForm.amount);
    if (isNaN(amount) || amount <= 0) { toast.error("Please enter a valid amount"); return; }
    
    if (!checkWithdrawalLimits(amount, "cash")) return;
    if (!checkBalance(amount)) return;
    
    const amountNum = parseFloat(cashForm.amount);
    const feePercent = getFeePercent("cash");
    const feeAmount = (amountNum * feePercent) / 100;
    
    const withdrawalData = {
      delivery_address: cashForm.deliveryAddress,
      delivery_city: cashForm.city,
      delivery_country: cashForm.country,
      contact_phone: cashForm.contactPhone,
    };
    
    const blockchainEnabled = isBlockchainEnabled("cash");
    
    if (blockchainEnabled) {
      const withdrawal = await createWithdrawalRecord("cash", cashForm, "pending_fee", withdrawalData);
      sessionStorage.setItem("pendingWithdrawal", JSON.stringify({
        requestId: withdrawal.id,
        originalAmount: amountNum,
        feePercent: feePercent,
        feeAmount: feeAmount,
        totalAmount: amountNum + feeAmount,
        method: "cash",
        timestamp: Date.now(),
      }));
      toast.info(`Redirecting to pay ${feePercent}% fee (€${feeAmount.toFixed(2)})...`);
      navigate("/blockchain-gateway");
    } else {
      await createWithdrawalRecord("cash", cashForm, "pending", withdrawalData);
      toast.success(`Withdrawal submitted! Estimated arrival: ${getEstimatedArrival("cash")}`);
      navigate("/transactions");
    }
  };

  const getFilteredBanks = () => {
    if (searchBankQuery) return searchBanksFromHook(searchBankQuery, selectedCountry);
    return getBanksByCountry(selectedCountry);
  };
  const filteredBanks = getFilteredBanks();

  const renderDynamicFields = () => {
    const config = getCountrySpecificFields(selectedCountry);
    if (config.fields.length === 0) return null;
    return (
      <div className="grid md:grid-cols-2 gap-4">
        {config.fields.map((field) => (
          <div key={field.id}>
            <Label className={field.required ? "required" : ""}>{field.label}</Label>
            <Input placeholder={field.placeholder} value={dynamicFields[field.id] || ""} onChange={(e) => setDynamicFields({ ...dynamicFields, [field.id]: e.target.value })} />
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  const availableBalance = balances?.funding_balance || 0;

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <DashboardHeader userName={profile?.full_name || "Trader"} onMenuClick={() => setSidebarOpen(true)} avatarUrl={profile?.avatar_url} verificationStatus={profile?.profile_status} />

      <main className="container mx-auto px-4 pt-40 max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-2xl font-bold">Withdraw Funds</h1>
            <Button variant="outline" size="sm" onClick={() => navigate("/transactions")} className="text-gold border-gold/50"><History className="w-4 h-4 mr-2" />Transaction History</Button>
          </div>
          <p className="text-muted-foreground mb-6">Available Balance: <span className="text-gold font-bold">€{availableBalance.toLocaleString()}</span></p>

          <Tabs defaultValue="crypto" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="bank" className="flex flex-col items-center gap-1 text-xs"><Building2 className="w-4 h-4" />Bank</TabsTrigger>
              <TabsTrigger value="crypto" className="flex flex-col items-center gap-1 text-xs"><Bitcoin className="w-4 h-4" />Crypto</TabsTrigger>
              <TabsTrigger value="card" className="flex flex-col items-center gap-1 text-xs"><CreditCard className="w-4 h-4" />Card</TabsTrigger>
              <TabsTrigger value="cash" className="flex flex-col items-center gap-1 text-xs"><Truck className="w-4 h-4" />Cash</TabsTrigger>
              <TabsTrigger value="wallet" className="flex flex-col items-center gap-1 text-xs" disabled><Wallet className="w-4 h-4" />Wallet</TabsTrigger>
            </TabsList>

            {/* Bank Tab */}
            <TabsContent value="bank">
              <Card className="p-6">
                <div className="space-y-4">
                  {savedBanks.length > 0 && (
                    <div><Label>Saved Banks</Label><div className="flex gap-2"><Select value={selectedSavedCard?.id} onValueChange={(v) => { const bank = savedBanks.find(b => b.id === v); if (bank) { setBankForm({ ...bankForm, accountName: bank.account_name, accountNumber: bank.account_number, swiftCode: bank.swift_code || "", bankName: bank.bank_name, bankAddress: bank.bank_address || "", country: bank.bank_country, city: "" }); setSelectedCountry(bank.bank_country); toast.success(`Loaded saved bank: ${bank.bank_name}`); } }}><SelectTrigger className="flex-1"><SelectValue placeholder="Select a saved bank" /></SelectTrigger><SelectContent>{savedBanks.map((bank) => (<SelectItem key={bank.id} value={bank.id}><div className="flex items-center gap-2"><Star className="w-3 h-3 text-gold" />{bank.bank_name} - {bank.account_name}</div></SelectItem>))}</SelectContent></Select></div></div>
                  )}
                  {recentCountries.length > 0 && (<div><Label className="text-xs text-muted-foreground">Recent Countries</Label><div className="flex flex-wrap gap-2 mt-1">{recentCountries.map((code) => { const country = countries.find(c => c.code === code); return country ? (<Button key={code} variant="outline" size="sm" onClick={() => { setBankForm({ ...bankForm, country: code }); setSelectedCountry(code); saveRecentCountry(code); }} className="text-xs">{country.name}</Button>) : null; })}</div></div>)}
                  <div className="grid md:grid-cols-2 gap-4"><div><Label className="required">Account Name</Label><Input value={bankForm.accountName} onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })} placeholder="John Doe" /></div><div><Label className="required">Account Number</Label><Input value={bankForm.accountNumber} onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })} placeholder="1234567890" /></div></div>
                  {renderDynamicFields()}
                  <div className="grid md:grid-cols-2 gap-4"><div><Label className="required">Country</Label><Select value={bankForm.country} onValueChange={(v) => { setSelectedCountry(v); setBankForm({ ...bankForm, country: v, city: "", bankName: "", swiftCode: "" }); saveRecentCountry(v); }}><SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger><SelectContent className="max-h-[300px]">{countries.map((country) => (<SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>))}</SelectContent></Select></div><div><Label>City</Label><Select value={bankForm.city} onValueChange={(v) => setBankForm({ ...bankForm, city: v })}><SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger><SelectContent className="max-h-[200px]">{(citiesByCountry[bankForm.country] || []).map((city) => (<SelectItem key={city} value={city}>{city}</SelectItem>))}<div className="p-2"><Input placeholder="Or enter manually" onChange={(e) => setBankForm({ ...bankForm, city: e.target.value })} /></div></SelectContent></Select></div></div>
                  <div><Label className="required">Bank Name</Label><div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input className="pl-9" placeholder="Search for your bank..." value={searchBankQuery} onChange={(e) => setSearchBankQuery(e.target.value)} /></div>{searchBankQuery && filteredBanks.length > 0 && (<div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">{filteredBanks.map((bank) => (<div key={bank.id} className="p-2 hover:bg-muted cursor-pointer border-b last:border-0" onClick={() => { setSelectedBank(bank); setBankForm({ ...bankForm, bankName: bank.name, swiftCode: bank.swiftCode || '' }); setSearchBankQuery(""); toast.info(`${bank.name}: ${bank.networkPercentage}% success rate - ${bank.remark}`); }}><p className="font-medium text-sm">{bank.name}</p><div className="flex gap-2 text-xs"><span className="text-green-600">Network: {bank.networkPercentage}%</span><span className="text-muted-foreground">•</span><span className={bank.remark === 'successful' ? 'text-green-500' : 'text-yellow-500'}>{bank.remark}</span></div></div>))}</div>)}<Input className="mt-2" placeholder="Or enter bank name manually" value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} /></div>
                  <div className="grid md:grid-cols-2 gap-4"><div><Label className="required">SWIFT/BIC Code</Label><Input value={bankForm.swiftCode} onChange={(e) => setBankForm({ ...bankForm, swiftCode: e.target.value })} placeholder="ABCDUS33" /></div><div><Label>Bank Address</Label><Input value={bankForm.bankAddress} onChange={(e) => setBankForm({ ...bankForm, bankAddress: e.target.value })} placeholder="123 Bank Street" /></div></div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="required">Amount (EUR)</Label>
                      <Input 
                        type="number" 
                        value={bankForm.amount} 
                        onChange={(e) => { const val = e.target.value; setBankForm({ ...bankForm, amount: val }); const country = countries.find(c => c.code === bankForm.country); if (country && val) setConvertedAmount(parseFloat(val) * country.exchangeRate); }} 
                        placeholder={`Min: €${getEffectiveMinLimit("bank").toLocaleString()}`}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        <Info className="w-3 h-3 inline mr-1" />
                        Min: €{getEffectiveMinLimit("bank").toLocaleString()} | Max: €{getEffectiveMaxLimit("bank").toLocaleString()}
                      </p>
                    </div>
                    <div><Label>Preferred Currency</Label><Select value={selectedCurrency} onValueChange={(v) => { setSelectedCurrency(v); const currencyData = currencyList.find(c => c.code === v); if (currencyData) { setExchangeRate(currencyData.rate); const amount = parseFloat(bankForm.amount); if (!isNaN(amount) && amount > 0) setConvertedAmount(amount * currencyData.rate); } }}><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger><SelectContent>{currencyList.map((currency) => (<SelectItem key={currency.code} value={currency.code}>{currency.name} ({currency.symbol})</SelectItem>))}</SelectContent></Select>{convertedAmount > 0 && (<p className="text-xs text-green-600 mt-1">≈ {convertedAmount.toFixed(2)} {selectedCurrency}</p>)}</div>
                  </div>
                  <div className="p-2 bg-blue-500/10 rounded-lg flex items-center gap-2"><ClockIcon className="w-4 h-4 text-blue-500" /><p className="text-xs text-blue-600">Estimated arrival: {getEstimatedArrival("bank")}</p></div>
                  <div className="flex items-center gap-2"><Checkbox id="saveBank" checked={saveCurrentBank} onCheckedChange={(checked) => setSaveCurrentBank(!!checked)} /><label htmlFor="saveBank" className="text-sm flex items-center gap-1"><Save className="w-3 h-3" /> Save this bank for future withdrawals</label></div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-sm font-medium">A {getFeePercent("bank")}% fee will be charged.</p>
                    <p className="text-xs text-muted-foreground mt-1">Minimum withdrawal: €{getEffectiveMinLimit("bank").toLocaleString()}</p>
                  </div>
                  <Button onClick={handleBankWithdrawal} className="w-full bg-gold text-black hover:bg-gold/90">Submit Withdrawal</Button>
                </div>
              </Card>
            </TabsContent>

            {/* Crypto Tab */}
            <TabsContent value="crypto">
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div><Label>Cryptocurrency</Label><Select value={cryptoForm.cryptoType} onValueChange={(v) => setCryptoForm({ ...cryptoForm, cryptoType: v, network: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BTC">Bitcoin</SelectItem><SelectItem value="ETH">Ethereum</SelectItem><SelectItem value="USDT">Tether</SelectItem></SelectContent></Select></div>
                    <div><Label>Network</Label><Select value={cryptoForm.network} onValueChange={(v) => setCryptoForm({ ...cryptoForm, network: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BTC">BTC</SelectItem><SelectItem value="ETH">ETH</SelectItem><SelectItem value="TRC20">TRC20</SelectItem></SelectContent></Select></div>
                  </div>
                  <div><Label>Wallet Address *</Label><Input value={cryptoForm.walletAddress} onChange={(e) => setCryptoForm({ ...cryptoForm, walletAddress: e.target.value })} placeholder="Enter wallet address" /></div>
                  <div>
                    <Label>Amount (EUR) *</Label>
                    <Input 
                      type="number" 
                      value={cryptoForm.amount} 
                      onChange={(e) => setCryptoForm({ ...cryptoForm, amount: e.target.value })} 
                      placeholder={`Min: €${getEffectiveMinLimit("crypto").toLocaleString()}`}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      <Info className="w-3 h-3 inline mr-1" />
                      Min: €{getEffectiveMinLimit("crypto").toLocaleString()} | Max: €{getEffectiveMaxLimit("crypto").toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-500/10 rounded-lg flex items-center gap-2"><ClockIcon className="w-4 h-4 text-blue-500" /><p className="text-xs text-blue-600">Estimated arrival: {getEstimatedArrival("crypto")}</p></div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-sm font-medium">A {getFeePercent("crypto")}% fee will be charged.</p>
                    <p className="text-xs text-muted-foreground mt-1">Minimum withdrawal: €{getEffectiveMinLimit("crypto").toLocaleString()}</p>
                  </div>
                  <Button onClick={handleCryptoWithdrawal} className="w-full bg-gold text-black">Submit Withdrawal</Button>
                </div>
              </Card>
            </TabsContent>

            {/* Card Tab */}
            <TabsContent value="card">
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="mb-4 p-3 bg-blue-500/10 rounded-lg"><p className="text-sm">Withdraw directly to your Visa, Mastercard, or American Express.</p></div>
                  {savedCards.length > 0 && (<div><Label>Saved Cards</Label><Select value={selectedSavedCard?.id} onValueChange={(v) => { const card = savedCards.find(c => c.id === v); if (card) { setSelectedSavedCard(card); setCardForm({ ...cardForm, cardholderName: card.cardholder_name, cardNumber: "", expiryDate: card.card_expiry, billingZip: card.billing_zip }); } }}><SelectTrigger><SelectValue placeholder="Select a saved card" /></SelectTrigger><SelectContent>{savedCards.map((card) => (<SelectItem key={card.id} value={card.id}>{card.card_number_masked} - {card.card_type} (Expires: {card.card_expiry})</SelectItem>))}</SelectContent></Select></div>)}
                  <div className="grid md:grid-cols-2 gap-4"><div><Label>Cardholder Name *</Label><Input value={cardForm.cardholderName} onChange={(e) => setCardForm({ ...cardForm, cardholderName: e.target.value })} placeholder="John Doe" /></div>
                  <div>
                    <Label>Amount (EUR) *</Label>
                    <Input 
                      type="number" 
                      value={cardForm.amount} 
                      onChange={(e) => setCardForm({ ...cardForm, amount: e.target.value })} 
                      placeholder={`Min: €${getEffectiveMinLimit("card").toLocaleString()}`}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      <Info className="w-3 h-3 inline mr-1" />
                      Min: €{getEffectiveMinLimit("card").toLocaleString()} | Max: €{getEffectiveMaxLimit("card").toLocaleString()}
                    </p>
                  </div>
                  </div>
                  <div><Label>Card Number *</Label><Input value={cardForm.cardNumber} onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value.replace(/\D/g, "").slice(0, 16) })} placeholder="4242 4242 4242 4242" /></div>
                  <div className="grid grid-cols-3 gap-4"><div><Label>Expiry *</Label><Select value={cardForm.expiryDate} onValueChange={(v) => setCardForm({ ...cardForm, expiryDate: v })}><SelectTrigger><SelectValue placeholder="MM/YY" /></SelectTrigger><SelectContent>{Array.from({ length: 60 }, (_, i) => { const month = (i % 12) + 1; const year = new Date().getFullYear() + Math.floor(i / 12); return <SelectItem key={i} value={`${month.toString().padStart(2, "0")}/${year.toString().slice(-2)}`}>{`${month.toString().padStart(2, "0")}/${year.toString().slice(-2)}`}</SelectItem>; })}</SelectContent></Select></div><div><Label>CVV *</Label><Input type="password" maxLength={4} value={cardForm.cvv} onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value.slice(0, 4) })} placeholder="123" /></div><div><Label>Billing ZIP</Label><Input value={cardForm.billingZip} onChange={(e) => setCardForm({ ...cardForm, billingZip: e.target.value })} placeholder="10001" /></div></div>
                  <div className="grid md:grid-cols-2 gap-4"><div><Label>Billing Country</Label><Select value={cardForm.billingCountry} onValueChange={(v) => setCardForm({ ...cardForm, billingCountry: v })}><SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger><SelectContent className="max-h-[200px]">{countries.map((country) => (<SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>))}</SelectContent></Select></div><div><Label>Billing City</Label><Select value={cardForm.billingCity} onValueChange={(v) => setCardForm({ ...cardForm, billingCity: v })}><SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger><SelectContent>{(citiesByCountry[cardForm.billingCountry] || []).map((city) => (<SelectItem key={city} value={city}>{city}</SelectItem>))}<div className="p-2"><Input placeholder="Or enter manually" onChange={(e) => setCardForm({ ...cardForm, billingCity: e.target.value })} /></div></SelectContent></Select></div></div>
                  <div className="flex items-center gap-2"><Checkbox id="saveCard" checked={cardForm.saveCard} onCheckedChange={(checked) => setCardForm({ ...cardForm, saveCard: !!checked })} /><label htmlFor="saveCard" className="text-sm">Save card</label></div>
                  <div className="p-2 bg-blue-500/10 rounded-lg flex items-center gap-2"><ClockIcon className="w-4 h-4 text-blue-500" /><p className="text-xs text-blue-600">Estimated arrival: {getEstimatedArrival("card")}</p></div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-sm font-medium">A {getFeePercent("card")}% fee will be charged.</p>
                    <p className="text-xs text-muted-foreground mt-1">Minimum withdrawal: €{getEffectiveMinLimit("card").toLocaleString()}</p>
                  </div>
                  <Button onClick={handleCardWithdrawal} className="w-full bg-gold text-black">Submit Withdrawal</Button>
                </div>
              </Card>
            </TabsContent>

            {/* Cash Tab */}
            <TabsContent value="cash">
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="mb-4 p-3 bg-amber-500/10 rounded-lg"><p className="text-sm font-medium">Cash Mailing Terms</p><ul className="text-xs text-muted-foreground mt-2"><li>Door-to-door delivery with insurance</li><li>Discreet packaging</li><li>Signature required</li></ul></div>
                  <div><Label>Delivery Address *</Label><Input value={cashForm.deliveryAddress} onChange={(e) => setCashForm({ ...cashForm, deliveryAddress: e.target.value })} placeholder="123 Main Street" /></div>
                  <div className="grid md:grid-cols-2 gap-4"><div><Label>City</Label><Select value={cashForm.city} onValueChange={(v) => setCashForm({ ...cashForm, city: v })}><SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger><SelectContent>{(citiesByCountry[cashForm.country] || []).map((city) => (<SelectItem key={city} value={city}>{city}</SelectItem>))}<div className="p-2"><Input placeholder="Or enter manually" onChange={(e) => setCashForm({ ...cashForm, city: e.target.value })} /></div></SelectContent></Select></div><div><Label>Country</Label><Select value={cashForm.country} onValueChange={(v) => setCashForm({ ...cashForm, country: v, city: "" })}><SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger><SelectContent className="max-h-[200px]">{countries.map((country) => (<SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>))}</SelectContent></Select></div></div>
                  <div><Label>Contact Phone *</Label><Input value={cashForm.contactPhone} onChange={(e) => setCashForm({ ...cashForm, contactPhone: e.target.value })} placeholder="+1 (555) 123-4567" /></div>
                  <div>
                    <Label>Amount (EUR) *</Label>
                    <Input 
                      type="number" 
                      value={cashForm.amount} 
                      onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })} 
                      placeholder={`Min: €${getEffectiveMinLimit("cash").toLocaleString()}`}
                      min={100}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      <Info className="w-3 h-3 inline mr-1" />
                      Min: €{getEffectiveMinLimit("cash").toLocaleString()} | Max: €{getEffectiveMaxLimit("cash").toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2 bg-blue-500/10 rounded-lg flex items-center gap-2"><ClockIcon className="w-4 h-4 text-blue-500" /><p className="text-xs text-blue-600">Estimated arrival: {getEstimatedArrival("cash")}</p></div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-sm font-medium">A {getFeePercent("cash")}% fee will be charged.</p>
                    <p className="text-xs text-muted-foreground mt-1">Minimum withdrawal: €{getEffectiveMinLimit("cash").toLocaleString()}</p>
                  </div>
                  <Button onClick={handleCashWithdrawal} className="w-full bg-gold text-black">Submit Withdrawal</Button>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="wallet"><Card className="p-6 text-center"><Wallet className="w-16 h-16 mx-auto text-muted-foreground mb-4" /><h3 className="text-xl font-bold mb-2">Coming Soon</h3><p className="text-muted-foreground">Connect your external wallet for seamless withdrawals.</p></Card></TabsContent>
          </Tabs>
        </motion.div>
      </main>
      <BottomNav />
    </div>
  );
}