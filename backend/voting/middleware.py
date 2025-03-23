# voting/middleware.py
from django.http import JsonResponse


class FingerprintMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Validate fingerprint for all POST requests
        if request.method == "POST" and "fingerprint" in request.POST:
            fp = request.POST["fingerprint"]
            if not self.is_valid_fingerprint(fp):
                return JsonResponse({"error": "Invalid browser signature"}, status=400)
        return response

    @staticmethod
    def is_valid_fingerprint(fp):
        return fp and len(fp) == 32  # Add more checks as needed
