import { ScrollView, StyleSheet, Text, View, Linking, TouchableOpacity } from "react-native";
import { ShieldCheck, FileText, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react-native";
import { PRIMARY_COLOR } from "../../constants/theme";

const LAST_UPDATED = "December 1, 2025";
const COMPANY = "Magizh Digital Marketing Solutions Private Limited";
const CIN = "CIN: U63999TN2024PTC172597";
const EMAIL = "lobbiofficial@gmail.com";
const ADDRESS = "3/501, Subash Street, Muneeswarar Nagar, Iyer Bungalow, Madurai, Tamil Nadu, 625014";

function Hero({ Icon, titleTop, titleBottom }) {
  return (
    <View style={styles.hero}>
      <View style={styles.badge}>
        <Icon size={12} color={PRIMARY_COLOR} />
        <Text style={styles.badgeText}>LEGAL & COMPLIANCE</Text>
      </View>
      <Text style={styles.titleTop}>{titleTop}</Text>
      <Text style={styles.titleBottom}>{titleBottom}</Text>
      <Text style={styles.lastUpdated}>
        LAST UPDATED: {LAST_UPDATED.toUpperCase()} • {COMPANY.toUpperCase()}
      </Text>
    </View>
  );
}

function Sec({ title, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionDash} />
        <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function P({ children }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

function Strong({ children }) {
  return <Text style={styles.strong}>{children}</Text>;
}

function Link({ children, onPress }) {
  return (
    <Text style={styles.link} onPress={onPress}>
      {children}
    </Text>
  );
}

function Bullets({ items }) {
  return (
    <View style={{ marginTop: 8, gap: 10 }}>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function ContactCard({ emailLabel = "Email" }) {
  return (
    <View style={styles.contactCard}>
      <Text style={styles.contactTitle}>{COMPANY.toUpperCase()}</Text>
      <Text style={styles.contactCin}>{CIN}</Text>
      <View style={{ gap: 10, marginTop: 12 }}>
        <View>
          <Text style={styles.contactLabel}>{emailLabel.toUpperCase()}</Text>
          <Text style={styles.contactLink} onPress={() => Linking.openURL(`mailto:${EMAIL}`)}>
            {EMAIL}
          </Text>
        </View>
        <View>
          <Text style={styles.contactLabel}>LOCATION</Text>
          <Text style={styles.contactAddress}>{ADDRESS}</Text>
        </View>
      </View>
    </View>
  );
}

function Article({ children }) {
  return <View style={styles.article}>{children}</View>;
}

/* ---------------- Privacy Policy ---------------- */

export function PrivacyPolicyContent() {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Hero Icon={ShieldCheck} titleTop="PRIVACY" titleBottom="POLICY" />

      <Article>
        <Sec title="1. Introduction">
          <P>
            {COMPANY} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates LOBBI. This Privacy Policy explains how we collect, use, and protect your information when you use our Service. By using LOBBI, you agree to this policy.
          </P>
        </Sec>

        <Sec title="2. Information We Collect">
          <P><Strong>a) Information you provide:</Strong></P>
          <Bullets items={[
            "Name, email, and phone number during registration",
            "Sport preferences and skill level",
            "Payment info processed via Cashfree (we do not store card details)",
            "Venue details provided by venue owners",
          ]} />
          <View style={{ height: 12 }} />
          <P><Strong>b) Automatically collected:</Strong></P>
          <Bullets items={[
            "Device and browser information",
            "Usage data and activity logs",
            "Location data only when you use 'Near Me' search (with explicit permission)",
          ]} />
        </Sec>

        <Sec title="3. How We Use Your Information">
          <Bullets items={[
            "To process bookings and payments",
            "To match players via AI matchmaking",
            "To send booking confirmations and reminders",
            "To improve and personalise the platform",
            "To comply with legal obligations",
          ]} />
        </Sec>

        <Sec title="4. Payment Information">
          <P>
            All payments are processed by <Strong>Cashfree</Strong> (PCI-DSS compliant). We do not store card details. See{" "}
            <Link onPress={() => Linking.openURL("https://www.cashfree.com/privacy-policy/")}>
              Cashfree&apos;s Privacy Policy
            </Link>
            .
          </P>
        </Sec>

        <Sec title="5. Data Sharing">
          <P>We do not sell your data. We share data only with:</P>
          <View style={{ marginTop: 8, gap: 10 }}>
            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}><Strong>Venue Owners:</Strong> Name and contact for confirmed bookings only</Text>
            </View>
            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}><Strong>Cashfree:</Strong> For payment processing</Text>
            </View>
            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}><Strong>Legal Authorities:</Strong> When required by law</Text>
            </View>
          </View>
        </Sec>

        <Sec title="6. Data Retention">
          <P>Data is retained while your account is active. Booking records are kept for 3 years. You may request deletion by contacting us.</P>
        </Sec>

        <Sec title="7. Your Rights">
          <P>
            You have the right to access, correct, or delete your personal data. Contact{" "}
            <Link onPress={() => Linking.openURL(`mailto:${EMAIL}`)}>{EMAIL}</Link>.
          </P>
        </Sec>

        <Sec title="8. Security">
          <P>We use HTTPS, hashed passwords, and JWT authentication. No system is 100% secure, but we follow industry best practices to protect your data.</P>
        </Sec>

        <Sec title="9. Contact">
          <ContactCard />
        </Sec>
      </Article>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

/* ---------------- Terms of Service ---------------- */

export function TermsContent({ onNavigateRefund }) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Hero Icon={FileText} titleTop="TERMS OF" titleBottom="SERVICE" />

      <Article>
        <Sec title="1. Acceptance of Terms">
          <P>By accessing LOBBI operated by {COMPANY}, you agree to be bound by these Terms. If you disagree, please do not use our Service.</P>
        </Sec>

        <Sec title="2. Description of Service">
          <P>LOBBI enables players to discover and book sports facilities, venue owners to manage and monetise facilities, coaches to offer training, and players to find opponents via AI matchmaking.</P>
        </Sec>

        <Sec title="3. User Accounts">
          <P>You are responsible for maintaining account confidentiality and for all activities under your account. Provide accurate registration information. We may suspend accounts that violate these terms.</P>
        </Sec>

        <Sec title="4. Booking Terms">
          <P><Strong>4.1 Reservation:</Strong> A temporary slot lock is placed for up to 30 minutes to complete payment. Unpaid bookings are auto-cancelled.</P>
          <View style={{ height: 8 }} />
          <P><Strong>4.2 Payment:</Strong> Full payment is required to confirm a booking.</P>
          <View style={{ height: 8 }} />
          <P><Strong>4.3 Split Payments:</Strong> Multiple players may split booking costs. Confirmation requires all participants to pay.</P>
        </Sec>

        <Sec title="5. Cancellation & Refunds">
          <P>
            See our{" "}
            <Link onPress={onNavigateRefund}>Cancellation and Refund Policy</Link> for full details.
          </P>
        </Sec>

        <Sec title="6. Venue Owner Obligations">
          <Bullets items={[
            "Provide accurate venue information and availability",
            "Honour all confirmed bookings made via LOBBI",
            "Maintain facilities in a safe condition",
            "Comply with all applicable local regulations",
          ]} />
        </Sec>

        <Sec title="7. Prohibited Activities">
          <Bullets items={[
            "Use for illegal or unauthorised purposes",
            "Manipulating rating or matchmaking systems",
            "Posting false or misleading reviews",
            "Reselling booked slots without written consent",
          ]} />
        </Sec>

        <Sec title="8. Limitation of Liability">
          <P>{COMPANY} is not liable for injuries at facilities, loss of revenue, or actions of third parties. Total liability is capped at the amount paid for the specific booking.</P>
        </Sec>

        <Sec title="9. Governing Law">
          <P>These Terms are governed by the laws of India. Disputes are subject to the exclusive jurisdiction of the courts of Madurai, Tamil Nadu.</P>
        </Sec>

        <Sec title="10. Contact">
          <ContactCard />
        </Sec>
      </Article>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

/* ---------------- Refund Policy ---------------- */

function RefundSummaryCard({ Icon, tint, title, desc }) {
  return (
    <View style={[styles.refundCard, { borderLeftColor: tint, backgroundColor: tint + "10", borderColor: tint + "40" }]}>
      <Icon size={22} color={tint} />
      <Text style={styles.refundCardTitle}>{title.toUpperCase()}</Text>
      <Text style={styles.refundCardDesc}>{desc}</Text>
    </View>
  );
}

function RefundRow({ time, refund, timeline, last }) {
  return (
    <View style={[styles.refundRow, last && { borderBottomWidth: 0 }]}>
      <Text style={[styles.refundCell, { flex: 2 }]}>{time}</Text>
      <Text style={[styles.refundCell, styles.refundCellBold, { flex: 1 }]}>{refund}</Text>
      <Text style={[styles.refundCell, { flex: 1, color: "#94A3B8" }]}>{timeline}</Text>
    </View>
  );
}

export function RefundPolicyContent() {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Hero Icon={Clock} titleTop="CANCELLATION &" titleBottom="REFUNDS" />

      <View style={{ gap: 12, marginBottom: 8 }}>
        <RefundSummaryCard Icon={CheckCircle2} tint="#16A34A" title="Full Refund" desc="Cancelled 24+ hrs before slot" />
        <RefundSummaryCard Icon={Clock} tint="#CA8A04" title="50% Refund" desc="Cancelled 4–24 hrs before slot" />
        <RefundSummaryCard Icon={XCircle} tint="#DC2626" title="No Refund" desc="Cancelled <4 hrs before slot" />
      </View>

      <Article>
        <Sec title="1. Cancellation by Player">
          <View style={styles.refundTable}>
            <View style={[styles.refundRow, styles.refundHeaderRow]}>
              <Text style={[styles.refundHead, { flex: 2 }]}>CANCELLATION TIME</Text>
              <Text style={[styles.refundHead, { flex: 1 }]}>REFUND</Text>
              <Text style={[styles.refundHead, { flex: 1 }]}>TIMELINE</Text>
            </View>
            <RefundRow time="More than 24 hours before slot" refund="100%" timeline="5–7 business days" />
            <RefundRow time="4 to 24 hours before slot" refund="50%" timeline="5–7 business days" />
            <RefundRow time="Less than 4 hours before slot" refund="No refund" timeline="—" />
            <RefundRow time="No-show" refund="No refund" timeline="—" last />
          </View>
        </Sec>

        <Sec title="2. Cancellation by Venue">
          <P>
            If a venue cancels a confirmed booking, the player receives a{" "}
            <Strong>100% refund</Strong> regardless of timing.
          </P>
        </Sec>

        <Sec title="3. How to Cancel">
          <View style={{ gap: 8 }}>
            <Text style={styles.paragraph}>
              <Strong>1.</Strong>  Login to LOBBI → Player Dashboard → Bookings
            </Text>
            <Text style={styles.paragraph}>
              <Strong>2.</Strong>  Select the booking and click <Strong>Cancel Booking</Strong>
            </Text>
          </View>
        </Sec>

        <Sec title="4. Refund Method">
          <View style={{ marginTop: 4, gap: 10 }}>
            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}><Strong>Credit/Debit Cards:</Strong> 5–7 business days</Text>
            </View>
            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}><Strong>UPI / Net Banking:</Strong> 3–5 business days</Text>
            </View>
            <View style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}><Strong>Wallets:</Strong> 1–3 business days</Text>
            </View>
          </View>
          <View style={{ height: 10 }} />
          <P>All refunds are processed securely via <Strong>Cashfree</Strong>.</P>
        </Sec>

        <Sec title="5. Split Payment Bookings">
          <P>Refunds for split payments are issued proportionally to each participant who paid. Unpaid split slots that expire incur no charges.</P>
        </Sec>

        <Sec title="6. Non-Refundable Situations">
          <View style={styles.warnBox}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <AlertCircle size={18} color="#DC2626" />
              <Text style={styles.warnTitle}>IMPORTANT NOTE</Text>
            </View>
            <Bullets items={[
              "Cancellations within 4 hours of slot time",
              "No-shows at the venue",
              "Accounts terminated for policy violations",
              "External factors (e.g., weather) outside the venue's control",
            ]} />
          </View>
        </Sec>

        <Sec title="7. Disputes">
          <P>
            Contact <Link onPress={() => Linking.openURL(`mailto:${EMAIL}`)}>{EMAIL}</Link> within 7 days of booking with your booking ID. We aim to resolve all disputes within 10 business days.
          </P>
        </Sec>

        <Sec title="8. Contact">
          <ContactCard emailLabel="Email Support" />
        </Sec>
      </Article>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 0 },

  // Hero
  hero: { marginTop: 4, marginBottom: 16, gap: 10 },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: PRIMARY_COLOR + "15",
    borderWidth: 1,
    borderColor: PRIMARY_COLOR + "30",
  },
  badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, color: PRIMARY_COLOR },
  titleTop: { fontSize: 36, fontWeight: "900", color: "#0F172A", letterSpacing: -0.5, lineHeight: 38 },
  titleBottom: { fontSize: 36, fontWeight: "900", color: PRIMARY_COLOR, letterSpacing: -0.5, lineHeight: 38 },
  lastUpdated: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1, marginTop: 6 },

  // Article container
  article: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 16,
  },

  // Section
  section: { marginBottom: 22 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  sectionDash: { width: 22, height: 2, backgroundColor: PRIMARY_COLOR },
  sectionTitle: { fontSize: 13, fontWeight: "900", color: "#0F172A", letterSpacing: 0.5, flex: 1 },
  sectionBody: { gap: 4 },

  paragraph: { fontSize: 13.5, lineHeight: 21, color: "#475569" },
  strong: { fontWeight: "700", color: "#0F172A" },
  link: { color: PRIMARY_COLOR, fontWeight: "700" },

  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: PRIMARY_COLOR, marginTop: 8 },
  bulletText: { flex: 1, fontSize: 13.5, lineHeight: 21, color: "#475569" },

  // Contact card
  contactCard: {
    backgroundColor: PRIMARY_COLOR + "08",
    borderWidth: 1,
    borderColor: PRIMARY_COLOR + "25",
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
  },
  contactTitle: { fontSize: 13, fontWeight: "900", color: "#0F172A", letterSpacing: 0.8 },
  contactCin: { fontSize: 10, color: "#94A3B8", marginTop: 4 },
  contactLabel: { fontSize: 9.5, fontWeight: "900", color: "#94A3B8", letterSpacing: 1.5, marginBottom: 3 },
  contactLink: { fontSize: 13, fontWeight: "700", color: PRIMARY_COLOR },
  contactAddress: { fontSize: 13, color: "#475569", lineHeight: 19 },

  // Refund summary cards
  refundCard: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  refundCardTitle: { fontSize: 14, fontWeight: "900", color: "#0F172A", letterSpacing: 0.5, marginTop: 4 },
  refundCardDesc: { fontSize: 12, color: "#64748B", fontWeight: "600" },

  // Refund table
  refundTable: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    marginTop: 6,
  },
  refundRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  refundHeaderRow: { backgroundColor: "#F8FAFC" },
  refundHead: { fontSize: 10, fontWeight: "900", color: "#0F172A", letterSpacing: 0.8 },
  refundCell: { fontSize: 12, color: "#475569" },
  refundCellBold: { fontWeight: "800", color: "#0F172A" },

  // Warn box
  warnBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
  },
  warnTitle: { fontSize: 11, fontWeight: "900", color: "#DC2626", letterSpacing: 1 },
});
