from rest_framework import generics
from rest_framework.permissions import IsAuthenticated


class TripListCreateView(generics.GenericAPIView):
    """"""

    permission_classes = [IsAuthenticated]

    pass
