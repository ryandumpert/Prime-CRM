import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

// POST /api/templates/seed - Seed default templates (admin only, one-time use)
export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if templates already exist
        const count = await prisma.messageTemplate.count();
        if (count > 0) {
            return NextResponse.json({ message: 'Templates already seeded', count });
        }

        const defaults = [
            // Initial Outreach
            {
                name: 'Intro Text - General',
                category: 'initial_outreach',
                type: 'text',
                subject: null,
                body: `Hi {{firstName}}, this is {{advisorName}} from Prime Loan Advisors. I'm reaching out because we received your inquiry about a loan. I'd love to chat and see how I can help. When's a good time to connect?`,
                sortOrder: 1,
            },
            {
                name: 'Intro Email - DSCR',
                category: 'initial_outreach',
                type: 'email',
                subject: 'Your DSCR Loan Inquiry — Prime Loan Advisors',
                body: `Hi {{firstName}},

Thank you for your interest in DSCR loans! My name is {{advisorName}} and I'm a loan advisor at Prime Loan Advisors specializing in investment property financing.

DSCR (Debt Service Coverage Ratio) loans are a great option for investors who want to qualify based on the property's rental income rather than personal income. I'd love to walk you through your options and find the best fit.

Would you have 15 minutes this week for a quick call? You can reach me directly at this email or give me a call.

Best regards,
{{advisorName}}
Prime Loan Advisors`,
                sortOrder: 2,
            },
            {
                name: 'Intro Email - General',
                category: 'initial_outreach',
                type: 'email',
                subject: 'Following Up on Your Loan Inquiry — Prime Loan Advisors',
                body: `Hi {{firstName}},

Thank you for reaching out to Prime Loan Advisors! My name is {{advisorName}} and I'll be your dedicated loan advisor.

I'd love to learn more about what you're looking for and discuss your financing options. Whether you're purchasing, refinancing, or exploring investment opportunities, we have programs tailored to your needs.

Would you have a few minutes for a quick introductory call? I'm happy to work around your schedule.

Looking forward to connecting!

Best,
{{advisorName}}
Prime Loan Advisors`,
                sortOrder: 3,
            },

            // Follow-Up
            {
                name: 'Follow-Up Text - After Voicemail',
                category: 'follow_up',
                type: 'text',
                subject: null,
                body: `Hi {{firstName}}, it's {{advisorName}} from Prime Loan Advisors. I just left you a voicemail. I wanted to follow up on your loan inquiry — feel free to text me back whenever it's convenient!`,
                sortOrder: 1,
            },
            {
                name: 'Follow-Up Email - No Response',
                category: 'follow_up',
                type: 'email',
                subject: 'Quick Follow-Up — Prime Loan Advisors',
                body: `Hi {{firstName}},

I wanted to follow up on my previous message. I understand things get busy, but I'm here whenever you're ready to discuss your loan options.

If now isn't the right time, no worries at all — just let me know and I'll check back later. If you have any questions in the meantime, don't hesitate to reach out.

Best,
{{advisorName}}
Prime Loan Advisors`,
                sortOrder: 2,
            },
            {
                name: 'Follow-Up Text - Check-In',
                category: 'follow_up',
                type: 'text',
                subject: null,
                body: `Hey {{firstName}}, just wanted to check in! Have you had a chance to think about your loan options? Happy to answer any questions. - {{advisorName}}, Prime Loan Advisors`,
                sortOrder: 3,
            },

            // Document Request
            {
                name: 'Doc Request Email - Pre-Qual',
                category: 'doc_request',
                type: 'email',
                subject: 'Documents Needed for Pre-Qualification — Prime Loan Advisors',
                body: `Hi {{firstName}},

Great news — we're ready to move forward with your pre-qualification! To get started, I'll need the following documents:

• Two most recent pay stubs
• Two most recent bank statements (all pages)
• Two years of W-2s or 1099s
• Government-issued photo ID

You can reply to this email with the documents attached, or let me know if you'd prefer another method to send them securely.

Let me know if you have any questions!

Best,
{{advisorName}}
Prime Loan Advisors`,
                sortOrder: 1,
            },
            {
                name: 'Doc Request Text - Reminder',
                category: 'doc_request',
                type: 'text',
                subject: null,
                body: `Hi {{firstName}}, friendly reminder to send over the documents we discussed so we can keep your loan moving forward. Feel free to email them to me or let me know if you need any help! - {{advisorName}}`,
                sortOrder: 2,
            },

            // Rate Quote
            {
                name: 'Rate Quote Email',
                category: 'rate_quote',
                type: 'email',
                subject: 'Your Personalized Rate Quote — Prime Loan Advisors',
                body: `Hi {{firstName}},

Thank you for your patience! I've put together a personalized rate quote based on your scenario. Please see the details below:

[INSERT RATE DETAILS HERE]

These rates are subject to change based on market conditions, so I recommend locking in sooner rather than later if you're ready to move forward.

Would you like to schedule a call to go over the numbers together? I'm happy to explain everything in detail.

Best,
{{advisorName}}
Prime Loan Advisors`,
                sortOrder: 1,
            },
            {
                name: 'Rate Quote Text',
                category: 'rate_quote',
                type: 'text',
                subject: null,
                body: `Hi {{firstName}}, I just sent you an email with your personalized rate quote! Let me know if you have any questions or want to jump on a quick call to discuss. - {{advisorName}}`,
                sortOrder: 2,
            },

            // General
            {
                name: 'Thank You - After Call',
                category: 'general',
                type: 'text',
                subject: null,
                body: `Great talking with you {{firstName}}! As discussed, I'll get everything started on my end. Don't hesitate to reach out if anything comes up. - {{advisorName}}, Prime Loan Advisors`,
                sortOrder: 1,
            },
            {
                name: 'Status Update Email',
                category: 'general',
                type: 'email',
                subject: 'Loan Status Update — Prime Loan Advisors',
                body: `Hi {{firstName}},

I wanted to give you a quick update on your loan:

[INSERT STATUS UPDATE HERE]

Everything is progressing well. If you have any questions or concerns, please don't hesitate to reach out.

Best,
{{advisorName}}
Prime Loan Advisors`,
                sortOrder: 2,
            },
        ];

        await prisma.messageTemplate.createMany({
            data: defaults.map(t => ({
                ...t,
                createdBy: session.user.id,
            })),
        });

        return NextResponse.json({ message: 'Templates seeded successfully', count: defaults.length }, { status: 201 });
    } catch (error) {
        console.error('Error seeding templates:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
