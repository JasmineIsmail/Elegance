const PDFDocument=require('pdfkit') ;
const Order= require('../model/orderModel');
const getPdfReport = async (req, res) => {
    try {
        let { fromDate, toDate } = req.body;

        fromDate = new Date(fromDate);
        toDate = new Date(toDate);
        toDate.setHours(23, 59, 59, 999);

        const salesData = await Order.find({
            status: "Delivered",
            date: {
                $gte: fromDate,
                $lte: toDate
            }
        })
            .populate("userId")
            .populate("products.productId")
            .sort({ date: -1 })
            .lean();

        const filename = `Sales_Report_${Date.now()}.pdf`;

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}"`
        );

        const doc = new PDFDocument({
            margin: 30,
            size: "A4"
        });

        doc.pipe(res);

        /* -------------------------------------------------- */
        /* PAGE SETTINGS                                      */
        /* -------------------------------------------------- */

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;

        const table = {
            order: 30,
            customer: 95,
            date: 220,
            payment: 330,
            total: 450
        };

        let y = 40;

        /* -------------------------------------------------- */
        /* HEADER                                             */
        /* -------------------------------------------------- */

        doc
            .font("Helvetica-Bold")
            .fontSize(22)
            .text("ELEGANCE", {
                align: "center"
            });

        y = doc.y + 5;

        doc
            .font("Helvetica")
            .fontSize(15)
            .text("Sales Report", {
                align: "center"
            });

        y = doc.y + 10;

        doc
            .fontSize(11)
            .text(
                `Period : ${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}`,
                {
                    align: "center"
                }
            );

        y = doc.y + 20;

        /* -------------------------------------------------- */
        /* DRAW TABLE HEADER                                  */
        /* -------------------------------------------------- */

        const drawTableHeader = () => {

            doc
                .rect(25, y, 540, 25)
                .fill("#EAEAEA");

            doc.fillColor("black");

            doc.font("Helvetica-Bold").fontSize(10);

            doc.text("ORDER", table.order, y + 8);

            doc.text("CUSTOMER", table.customer, y + 8);

            doc.text("DATE", table.date, y + 8);

            doc.text("PAYMENT", table.payment, y + 8);

            doc.text("TOTAL", table.total, y + 8);

            y += 35;
        };

        drawTableHeader();

        /* -------------------------------------------------- */
        /* PAGE BREAK HELPER                                  */
        /* -------------------------------------------------- */

        const checkPageBreak = (requiredHeight = 120) => {

            if (y + requiredHeight > pageHeight - 60) {

                doc.addPage();

                y = 40;

                drawTableHeader();
            }
        };

        /* -------------------------------------------------- */
        /* GRAND TOTAL                                        */
        /* -------------------------------------------------- */

        let grandTotal = 0;

        /* -------------------------------------------------- */
        /* PRINT ORDERS                                       */
        /* -------------------------------------------------- */

        for (let i = 0; i < salesData.length; i++) {

            const order = salesData[i];

            checkPageBreak();

            grandTotal += order.Amount;

            doc.font("Helvetica-Bold").fontSize(10);

            doc.text(order.order_Id || "-", table.order, y);

            doc.text(
                order.userId?.name || "Deleted User",
                table.customer,
                y
            );

            doc.text(
                new Date(order.date).toLocaleDateString(),
                table.date,
                y
            );

            doc.text(
                order.paymentMethod,
                table.payment,
                y
            );

            doc.text(
                `₹${order.Amount}`,
                table.total,
                y
            );

            y += 22;

            /* ------------------------------------------ */
            /* PRODUCT HEADER                             */
            /* ------------------------------------------ */

            doc.font("Helvetica-Bold");

            doc.text("Products", 45, y);

            y += 18;

            doc.fontSize(10);

            doc.text("Name", 60, y);

            doc.text("Qty", 310, y);

            doc.text("Price", 380, y);

            y += 10;

            doc.moveTo(40, y)
                .lineTo(540, y)
                .stroke();

            y += 10;

                        /* ------------------------------------------ */
            /* PRODUCT ROWS                               */
            /* ------------------------------------------ */

            for (const product of order.products) {

                checkPageBreak(40);

                doc.font("Helvetica").fontSize(10);

                doc.text(
                    product.productId?.Name || "Deleted Product",
                    60,
                    y,
                    {
                        width: 220
                    }
                );

                doc.text(
                    String(product.count),
                    315,
                    y
                );

                doc.text(
                    `₹${product.productPrice}`,
                    380,
                    y
                );

                y += 20;
            }

            /* ------------------------------------------ */
            /* ORDER TOTAL                                */
            /* ------------------------------------------ */

            doc.moveTo(40, y)
                .lineTo(540, y)
                .stroke();

            y += 12;

            doc.font("Helvetica-Bold");

            doc.text(
                `Order Total : ₹${order.Amount}`,
                360,
                y
            );

            y += 30;

        }

        /* -------------------------------------------------- */
        /* SUMMARY                                            */
        /* -------------------------------------------------- */

        checkPageBreak(100);

        doc.moveTo(25, y)
            .lineTo(565, y)
            .lineWidth(1.5)
            .stroke();

        y += 20;

        doc.font("Helvetica-Bold")
            .fontSize(14)
            .text("REPORT SUMMARY", 30, y);

        y += 30;

        doc.fontSize(12);

        doc.text(
            `Total Orders : ${salesData.length}`,
            40,
            y
        );

        y += 25;

        doc.text(
            `Total Revenue : ₹${grandTotal}`,
            40,
            y
        );

        y += 40;

        /* -------------------------------------------------- */
        /* FOOTER                                             */
        /* -------------------------------------------------- */

        doc.moveTo(25, y)
            .lineTo(565, y)
            .stroke();

        y += 15;

        doc.font("Helvetica")
            .fontSize(10)
            .fillColor("gray")
            .text(
                `Generated on : ${new Date().toLocaleString()}`,
                30,
                y
            );

        doc.text(
            "Generated by Elegance Admin Panel",
            330,
            y
        );

        doc.end();

    } catch (error) {

        console.error(error);

        res.status(500).send("Internal Server Error");

    }
};

module.exports= getPdfReport ;