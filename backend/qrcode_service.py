import io
import base64


def gerar_qr_base64(url: str) -> str:
    import qrcode
    from qrcode.image.pure import PyPNGImage

    qr = qrcode.QRCode(version=1, box_size=8, border=3)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(image_factory=PyPNGImage)
    buffer = io.BytesIO()
    img.save(buffer)
    return base64.b64encode(buffer.getvalue()).decode()
