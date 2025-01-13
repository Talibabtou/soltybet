from django.db.models import Q, Sum, Count
from django.http import JsonResponse
from rest_framework import viewsets, mixins
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.shortcuts import get_object_or_404
from datetime import timedelta
from rest_framework.decorators import action
from datalog.models import User, Match, Bet, Fighter, Global
from datalog.serializers import UserSerializer, MatchSerializer, BetSerializer, FighterSerializer, GlobalSerializer
from rest_framework.response import Response
from rest_framework import status, permissions
from .permissions import ReadOnlyForGrafanaPermission
from django.db import transaction
from decimal import Decimal
from django.core.exceptions import PermissionDenied, ObjectDoesNotExist, ValidationError
import json
import logging

logger = logging.getLogger(__name__)

class NoBetsFoundException(ObjectDoesNotExist):
    pass

class BaseViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        if self.request.user.username.strip() not in ['scrap', 'front']:
            raise PermissionDenied("API permission denied")
        queryset = self.queryset
        query_params = self.request.query_params
        if query_params:
            filters = Q()
            for key, value in query_params.items():
                if hasattr(self.queryset.model, key):
                    filters |= Q(**{f"{key}__icontains": value})
            queryset = queryset.filter(filters)
        return queryset

from django.db import transaction

class UserViewSet(BaseViewSet, mixins.UpdateModelMixin):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    lookup_field = 'u_id'
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        if request.user.username.strip() != 'front':
            raise PermissionDenied("API permission denied")
        wallet = request.data.get('wallet')
        if not wallet:
            return Response({'error': 'Wallet address is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            with transaction.atomic():
                user, created = User.objects.select_for_update().get_or_create(wallet=wallet)
                serializer = self.get_serializer(user)
                return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def get_user_by_wallet(self, request): #to_remove
        if request.user.username.strip() != 'front':
            raise PermissionDenied("API permission denied")
        wallet = request.query_params.get('wallet')
        if not wallet:
            return Response({'error': 'Wallet is required'}, status=status.HTTP_400_BAD_REQUEST)
        user = self.get_user(wallet)
        if user:
            serializer = self.get_serializer(user)
            return Response(serializer.data)
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    def get_user(self, wallet):
        try:
            return User.objects.get(wallet=wallet)
        except User.DoesNotExist:
            return None
    @action(detail=False, methods=['get'])
    def check_ref_code(self, request):
        if request.user.username.strip() != 'front':
            raise PermissionDenied("API permission denied")
        ref_code = request.query_params.get('ref_code')
        if not ref_code:
            return Response({'error': 'Referral code is required'}, status=status.HTTP_400_BAD_REQUEST)
        exists = User.objects.filter(ref_code=ref_code).exists()
        return Response({'exists': exists})

    @action(detail=True, methods=['put'])
    def update_ref_code(self, request, u_id=None):
        if request.user.username.strip() != 'front':
            raise PermissionDenied("API permission denied")
        ref_code = request.data.get('ref_code')
        if not ref_code:
            return Response({'error': 'ref_code is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            with transaction.atomic():
                user = User.objects.select_for_update().get(u_id=u_id)
                if User.objects.filter(ref_code=ref_code).exclude(u_id=u_id).exists():
                    return Response({'error': 'This referral code is already in use by another user'}, status=status.HTTP_400_BAD_REQUEST)
                user.ref_code = ref_code
                user.save()
                serializer = self.get_serializer(user)
                return Response(serializer.data)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['put'])
    def update_referrer(self, request):
        if request.user.username.strip() != 'front':
            raise PermissionDenied("API permission denied")
        wallet = request.data.get('wallet')
        ref_code = request.data.get('ref_code')
        if not wallet or not ref_code:
            return Response({'error': 'Both wallet and ref_code are required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            with transaction.atomic():
                user = User.objects.select_for_update().get(wallet=wallet)
                referrer = User.objects.select_for_update().get(ref_code=ref_code)
                if user.ref_id:
                    return Response({'error': 'User already has a referrer'}, status=status.HTTP_400_BAD_REQUEST)
                if user.u_id == referrer.u_id:
                    return Response({'error': 'You cannot refer yourself'}, status=status.HTTP_400_BAD_REQUEST)
                user.ref_id = referrer
                user.save()
                serializer = self.get_serializer(user)
                return Response(serializer.data)
        except User.DoesNotExist:
            return Response({'error': 'User or referrer not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def get_referrer_wallet(self, request):
        if request.user.username.strip() != 'front':
            raise PermissionDenied("API permission denied")
        ref_id = request.query_params.get('ref_id')
        if not ref_id:
            return Response({'error': 'ref_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            referrer = User.objects.get(u_id=ref_id)
            return Response({'wallet': referrer.wallet})
        except User.DoesNotExist:
            return Response({'error': 'Referrer not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def top_volume(self, request):
        if request.user.username.strip() != 'front':
            raise PermissionDenied("API permission denied")
        
        users = User.objects.filter(total_volume__gt=0).order_by('-total_volume')[:10]
        data = [{
            'wallet': user.wallet, 
            'volume': float(user.total_volume)
        } for user in users]
        return Response(data)

    @action(detail=False, methods=['get'])
    def top_gain(self, request):
        if request.user.username.strip() != 'front':
            raise PermissionDenied("API permission denied")
        
        users = User.objects.all()
        data = [{
            'wallet': user.wallet,
            'volume': float(user.total_volume),
            'gain': float(user.total_gain),
            'pnl': float(user.total_gain - user.total_volume)
        } for user in users]
        
        # Filtrer et trier par PnL
        data = sorted(data, key=lambda x: x['pnl'], reverse=True)[:10]
        return Response(data)

    @action(detail=True, methods=['get'])
    def stats(self, request, u_id=None):
        if request.user.username.strip() != 'front':
            raise PermissionDenied("API permission denied")
        user = self.get_object()
        
        # Calcul du volume total (paris valides uniquement)
        total_volume = Bet.objects.filter(
            u_id=user,
            invalid_match=False,
            success_in=True
        ).aggregate(Sum('volume'))['volume__sum'] or 0

        # Calcul des gains (payouts des matchs valides)
        total_gain = Bet.objects.filter(
            u_id=user,
            invalid_match=False,  # Seulement les matchs valides
            success_out=True      # Paiements réussis
        ).aggregate(Sum('payout'))['payout__sum'] or 0

        # Calcul du total des payouts (gains + remboursements)
        total_payout = Bet.objects.filter(
            u_id=user,
            success_out=True  # Tous les payouts réussis
        ).aggregate(Sum('payout'))['payout__sum'] or 0

        # Nombre de paris et paris gagnants
        valid_bets = Bet.objects.filter(
            u_id=user,
            invalid_match=False,
            success_in=True
        )
        
        total_bets = valid_bets.count()
        winning_bets = valid_bets.filter(payout__gt=0).count()
        
        win_percentage = (winning_bets / total_bets * 100) if total_bets > 0 else 0
        
        stats = {
            'volume': float(total_volume),
            'total_volume': float(user.total_volume),
            'gain': float(total_gain),
            'nbBets': total_bets,
            'winningBets': winning_bets,
            'winPercentage': round(win_percentage, 2),
            'referral_gain': float(user.referral_gain) if user.referral_gain is not None else 0.0
        }
        return Response(stats)

    @action(detail=False, methods=['get'])
    def actual_wins_data(self, request):
        if request.user.username.strip() != 'front':
            raise PermissionDenied("API permission denied")
        
        m_id = request.query_params.get('m_id')
        wallet = request.query_params.get('wallet')
        
        if not m_id or not wallet:
            logger.warning("Bad request: m_id and wallet are required")
            return Response({'error': 'm_id and wallet are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(wallet=wallet)
            match = Match.objects.get(m_id=m_id)
            
            logger.info(f"Processing payout for match {m_id} and wallet {wallet}")
            
            invalid_match = Bet.objects.filter(m_id=match, invalid_match=True).exists()
            logger.info(f"Match invalid status: {invalid_match}")
            
            bets_query = Bet.objects.filter(
                m_id=match,
                u_id=user,
                payout__isnull=False,
                tx_out__isnull=False
            )
            
            if not invalid_match:
                winning_team = 'red' if match.winner == match.red_id else 'blue'
                logger.info(f"Valid match, winning team: {winning_team}")
                bets_query = bets_query.filter(team=winning_team)
            else:
                logger.info("Invalid match, processing all bets for refund")
            
            bets = list(bets_query)
            logger.info(f"Found {len(bets)} bets to process")
            for bet in bets:
                logger.info(f"Bet details: team={bet.team}, volume={bet.volume}, payout={bet.payout}, tx_out={bet.tx_out}")
            
            total_payout = bets_query.aggregate(Sum('payout'))['payout__sum'] or 0
            tx_out = bets_query.values_list('tx_out', flat=True).first()
            
            response_data = {
                'totalPayout': float(total_payout),
                'tx_out': tx_out,
                'invalidMatch': invalid_match,
                'status': 'completed',
                'debug_info': {
                    'match_id': m_id,
                    'winner': str(match.winner) if not invalid_match else 'invalid match',
                    'total_bets': len(bets)
                }
            }
            
            logger.info(f"Returning response: {response_data}")
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Error in actual_wins_data: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


    @action(detail=False, methods=['put'])
    def user_payout(self, request):
        if request.user.username.strip() != 'scrap':
            raise PermissionDenied("API permission denied")
        data = request.data
        
        try:
            with transaction.atomic():
                # Grouper les paris par utilisateur
                user_bets = {}
                for bet_data in data:
                    user_address = bet_data['user_address']
                    if user_address not in user_bets:
                        user_bets[user_address] = []
                    user_bets[user_address].append(bet_data)

                for user_address, bets in user_bets.items():
                    try:
                        user = User.objects.select_for_update().get(wallet=user_address)
                        
                        total_volume = Decimal('0')
                        total_gain = Decimal('0')
                        total_payout = Decimal('0')

                        for bet_data in bets:
                            bet = Bet.objects.select_for_update().get(b_id=bet_data['bet_id'])
                            payout = Decimal(str(bet_data['payout']))
                            
                            # Traiter les gains de parrainage
                            if bet_data.get('referrer_address'):
                                try:
                                    referrer = User.objects.select_for_update().get(
                                        wallet=bet_data['referrer_address']
                                    )
                                    royalty = Decimal(str(bet_data['referrer_royalty']))
                                    referrer.referral_gain += royalty
                                    referrer.save()
                                    
                                    #print(f"Referral gain processed for {bet_data['referrer_address']}: +{royalty} SOL")
                                except User.DoesNotExist:
                                    #print(f"Referrer not found: {bet_data['referrer_address']}")
                                    continue

                            if not bet_data['invalid_match']:
                                total_volume += bet.volume
                                total_gain += payout
                            total_payout += payout

                        #print(f"Processing user {user_address}:")
                        #print(f"- Volume: +{total_volume} SOL")
                        #print(f"- Gain: +{total_gain} SOL")
                        #print(f"- Payout: +{total_payout} SOL")

                        # Mise à jour des totaux de l'utilisateur
                        user.total_volume += total_volume
                        user.total_gain += total_gain
                        user.total_payout += total_payout
                        user.save()

                    except User.DoesNotExist:
                        print(f"User not found: {user_address}")
                        continue
                    except Bet.DoesNotExist:
                        print(f"Bet not found in bet_data: {bet_data}")
                        continue
                    except Exception as e:
                        print(f"Error processing user {user_address}: {str(e)}")
                        continue

                return Response({
                    "message": "User payouts processed successfully"
                }, status=status.HTTP_200_OK)
                    
        except Exception as e:
            print(f"Global error in user_payout: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    
    @action(detail=False, methods=['get'])
    def expected_wins_data(self, request):
        m_id = request.query_params.get('m_id')
        wallet = request.query_params.get('wallet')
        if not m_id or not wallet:
            return Response({'error': 'm_id and wallet are required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(wallet=wallet)
            red_bets = Bet.objects.filter(m_id__m_id=m_id, u_id=user, team='red').aggregate(Sum('volume'))
            blue_bets = Bet.objects.filter(m_id__m_id=m_id, u_id=user, team='blue').aggregate(Sum('volume'))
            response_data = {
                'userRedVolume': float(red_bets['volume__sum'] or 0),
                'userBlueVolume': float(blue_bets['volume__sum'] or 0)
            }
            return Response(response_data)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
    @action(detail=False, methods=['put'])
    def user_totals(self, request):
        if request.user.username.strip() != 'scrap':
            raise PermissionDenied("API permission denied")
        
        try:
            with transaction.atomic():
                users = User.objects.all().order_by('creation_date')
                for user in users:
                    total_volume = Bet.objects.filter(
                        u_id=user,
                        invalid_match=False,
                        success_in=True
                    ).aggregate(Sum('volume'))['volume__sum'] or 0

                    total_payout = Bet.objects.filter(
                        u_id=user,
                        success_out=True
                    ).aggregate(Sum('payout'))['payout__sum'] or 0

                    nb_bet = Bet.objects.filter(
                        u_id=user,
                        invalid_match=False,
                        success_in=True
                    ).values('m_id').distinct().count()

                    total_gain = Bet.objects.filter(
                    u_id=user,
                    invalid_match=False,  # Seulement les matchs valides
                    success_out=True      # Paiements réussis
                    ).aggregate(Sum('payout'))['payout__sum'] or 0

                    user.total_volume = total_volume
                    user.total_payout = total_payout
                    user.total_gain = total_gain
                    user.nb_bet = nb_bet
                    user.save()

                return Response({"message": "User totals recalculated successfully"}, status=status.HTTP_200_OK)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



    

class MatchViewSet(BaseViewSet, mixins.UpdateModelMixin):
    queryset = Match.objects.all()
    serializer_class = MatchSerializer
    lookup_field = 'm_id'
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        if request.user.username.strip() != 'scrap':
            raise PermissionDenied("API permission denied")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        match = Match.objects.create(
            red_id=serializer.validated_data['red_id'],
            blue_id=serializer.validated_data['blue_id'],
            duration=timedelta(seconds=0)
        )
        serialized_match = self.get_serializer(match)
        return Response(serialized_match.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['put'])
    def update_match(self, request):
        if self.request.user.username.strip() not in ['scrap']:
            raise PermissionDenied("API permission denied")
        match_id = request.data.get('match')
        winner_id = request.data.get('winner')
        duration_str = request.data.get('duration')
        if not winner_id or not duration_str:
            return Response({"error": "Both winner and duration are required"}, status=status.HTTP_400_BAD_REQUEST)
        match = get_object_or_404(Match, m_id=match_id)
        winner = get_object_or_404(Fighter, f_id=winner_id)
        match.winner = winner
        try:
            hours, minutes, seconds = map(int, duration_str.split(':'))
            duration = timedelta(hours=hours, minutes=minutes, seconds=seconds)
            match.duration = duration
        except ValueError:
            return Response({"error": "Invalid duration format. Use HH:MM:SS"}, status=status.HTTP_400_BAD_REQUEST)
        valid_bets = Bet.objects.filter(m_id=match, invalid_match=False)
        match.nb_bet = valid_bets.count()
        volumes = valid_bets.values('team').annotate(total_volume=Sum('volume'))
        for volume in volumes:
            if volume['team'] == 'blue':
                match.vol_blue = volume['total_volume'] or 0
            elif volume['team'] == 'red':
                match.vol_red = volume['total_volume'] or 0
        match.save()
        serializer = self.get_serializer(match)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        if request.user.username.strip() != 'stats':
            raise PermissionDenied("API permission denied")
        num_matches = Match.objects.count()
        return Response({"num_matches": num_matches}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def latest(self, request):
        if request.user.username.strip() != 'front':
            raise PermissionDenied("API permission denied")
        try:
            latest_match = Match.objects.latest('creation_date')
            serializer = self.get_serializer(latest_match)
            data = serializer.data
            data['vol_red'] = float(latest_match.vol_red)
            data['vol_blue'] = float(latest_match.vol_blue)
            return Response(serializer.data)
        except Match.DoesNotExist:
            return Response({'error': 'Aucun match trouvé'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)            

class BetViewSet(BaseViewSet, mixins.UpdateModelMixin):
    queryset = Bet.objects.all()
    serializer_class = BetSerializer
    lookup_field = 'b_id'
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def place_bet(self, request):
        if request.user.username.strip() != 'front':
            raise PermissionDenied("API permission denied")
        u_id = request.data.get('u_id')
        m_id = request.data.get('m_id')
        team = request.data.get('team')
        try:
            user = User.objects.get(u_id=u_id)
            match = Match.objects.get(m_id=m_id)
            if team == 'red':
                fighter = match.red_id
            elif team == 'blue':
                fighter = match.blue_id
            else:
                return Response({'error': 'Invalid team'}, status=status.HTTP_400_BAD_REQUEST)
            bet = Bet.objects.create(
                u_id=user,
                m_id=match,
                f_id=fighter,
                team=team,
                success_in=False
            )
            serializer = self.get_serializer(bet)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except User.DoesNotExist:
            print(f"User not found: {u_id}")
            return Response({'error': f"User not found: {u_id}"}, status=status.HTTP_404_NOT_FOUND)
        except Match.DoesNotExist:
            print(f"Match not found: {m_id}")
            return Response({'error': f"Match not found: {m_id}"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"Error creating bet: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['put'])
    @transaction.atomic
    def confirm_bet(self, request):
        if request.user.username.strip() != 'front':
            raise PermissionDenied("API permission denied")
        b_id = request.data.get('b_id')
        tx_in = request.data.get('tx_in')
        volume = request.data.get('volume')
        

        try:
            bet = Bet.objects.select_for_update().get(b_id=b_id)
            
            bet.tx_in = tx_in
            bet.success_in = True
            bet.volume = Decimal(str(volume))
            bet.save()
            
            serializer = self.get_serializer(bet)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
                
        except Bet.DoesNotExist:
            return Response({'error': 'Bet not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['delete'])
    @transaction.atomic
    def cancel_bet(self, request):
        if request.user.username.strip() != 'front':
            raise PermissionDenied("API permission denied")
        b_id = request.query_params.get('b_id')
        
        try:
            bet = Bet.objects.select_for_update().get(b_id=b_id)
            bet.delete()
            return Response({'message': 'Pari annulé avec succès'}, status=status.HTTP_200_OK)
            
        except Bet.DoesNotExist:
            return Response({'error': 'Pari non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    
    @action(detail=False, methods=['get'])
    @transaction.atomic
    def bets_volume(self, request):
        if request.user.username.strip() != 'scrap':
            raise PermissionDenied("API permission denied")
        
        m_id = request.query_params.get('m_id')
        if not m_id:
            return Response({'error': 'm_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            match = Match.objects.select_for_update().get(m_id=m_id)
            
            volumes = Bet.objects.filter(
                m_id=match,
                success_in=True
            ).values('team').annotate(
                total_volume=Sum('volume')
            )
            
            match.vol_red = 0
            match.vol_blue = 0
            
            for volume in volumes:
                if volume['team'] == 'red':
                    match.vol_red = volume['total_volume'] or 0
                elif volume['team'] == 'blue':
                    match.vol_blue = volume['total_volume'] or 0
            
            is_invalid = (match.vol_red == 0 and match.vol_blue > 0) or (match.vol_red > 0 and match.vol_blue == 0)
            
            if is_invalid:
                Bet.objects.filter(m_id=match).update(invalid_match=True)
            else:
                Bet.objects.filter(m_id=match).update(invalid_match=False)
            
            match.save()

            return Response({
                "total_red": float(match.vol_red),
                "total_blue": float(match.vol_blue),
                "debug_info": {
                    "is_invalid": is_invalid,
                    "total_bets": Bet.objects.filter(m_id=match, success_in=True).count(),
                    "total_red": float(match.vol_red),
                    "total_blue": float(match.vol_blue)
                }
            }, status=status.HTTP_200_OK)
            
        except Match.DoesNotExist:
            return Response({'error': 'Match not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def get_volumes(self, request):
        if request.user.username.strip() != 'scrap':
            raise PermissionDenied("API permission denied")
        
        m_id = request.query_params.get('m_id')
        if not m_id:
            return Response({'error': 'm_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            match = Match.objects.get(m_id=m_id)
            volumes = Bet.objects.filter(
                m_id=match,
                success_in=True
            ).values('team').annotate(
                total_volume=Sum('volume')
            )
            
            total_red = 0
            total_blue = 0
            
            for volume in volumes:
                if volume['team'] == 'red':
                    total_red = volume['total_volume'] or 0
                elif volume['team'] == 'blue':
                    total_blue = volume['total_volume'] or 0

            return Response({
                "total_red": float(total_red),
                "total_blue": float(total_blue),
                "debug_info": {
                    "total_bets": Bet.objects.filter(m_id=match, success_in=True).count()
                }
            })
            
        except Match.DoesNotExist:
            return Response({'error': 'Match not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['put'])
    def bet_payout(self, request):
        if request.user.username.strip() != 'scrap':
            raise PermissionDenied("API permission denied")
        data = request.data
        if not data:
            raise ValidationError("No data provided")
        bets_processed = 0
        bets_not_found = []
        try:
            for bet_data in data:
                bet_id = bet_data.get('bet_id')
                if not bet_id:
                    raise ValidationError(f"Missing bet_id in data: {bet_data}")
                try:
                    bet = Bet.objects.get(b_id=bet_id)
                    bet.payout = Decimal(str(bet_data['payout']))
                    bet.tx_out = bet_data['valid_hash']
                    bet.success_out = bool(bet_data['valid_hash'])
                    bet.invalid_match = bet_data['invalid_match']
                    bet.save()
                    bets_processed += 1
                except Bet.DoesNotExist:
                    bets_not_found.append(bet_id)
            return Response({
                "message": f"{bets_processed} bet(s) processed successfully",
                "bets_not_found": bets_not_found
            }, status=status.HTTP_200_OK)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f"An unexpected error occurred: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                

    @action(detail=False, methods=['get'])
    def bet_history(self, request):
        if request.user.username.strip() != 'front':
            raise PermissionDenied("API permission denied")
        
        wallet = request.query_params.get('wallet')
        if not wallet:
            return Response({'error': 'wallet is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(wallet=wallet)
            bets = Bet.objects.filter(
                u_id=user,
                success_in=True
            ).order_by('-creation_date')[:10]

            data = [{
                'b_id': str(bet.b_id)[:4],  # Tronqué
                'team': bet.team,
                'volume': float(bet.volume),
                'won': bet.payout > 0,
                'payout': float(bet.payout) if bet.payout > 0 else None,
                'date': bet.creation_date
            } for bet in bets]
            
            return Response(data)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)




class FighterViewSet(BaseViewSet, mixins.UpdateModelMixin):
    queryset = Fighter.objects.all()
    serializer_class = FighterSerializer
    lookup_field = 'f_id'
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def create(self, request):
        if request.user.username.strip() != 'scrap':
            raise PermissionDenied("API permission denied")
        fighter_name = request.data.get('name', '').replace(" ", "_")
        fighter, created = Fighter.objects.get_or_create(
            name=fighter_name,
            defaults={
                'nb_fight': 0,
                'win': 0,
                'lose': 0,
                'elo': 1000
            }
        )
        serializer = self.get_serializer(fighter)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
 
    @action(detail=False, methods=['put'])
    def update_fighter(self, request):
        if request.user.username.strip() != 'scrap':
            raise PermissionDenied("API permission denied")
        fighter_id = request.data.get('f_id')
        win = request.data.get('win', False)
        fighter = get_object_or_404(Fighter, f_id=fighter_id)
        fighter.nb_fight += 1
        if win:
            fighter.win += 1
        else:
            fighter.lose += 1
        fighter.nb_bet = Bet.objects.filter(
            f_id=fighter,
            invalid_match=False
        ).count()
        fighter.save()
        serializer = self.get_serializer(fighter)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['put'])
    def update_elo(self, request):
        if request.user.username.strip() != 'scrap':
            raise PermissionDenied("API permission denied")
        winner_id = request.data.get('winner_id')
        loser_id = request.data.get('loser_id')
        if not winner_id or not loser_id:
            return Response({"error": "Both winner_id and loser_id are required"}, status=status.HTTP_400_BAD_REQUEST)
        winner = get_object_or_404(Fighter, f_id=winner_id)
        loser = get_object_or_404(Fighter, f_id=loser_id)
        def calculate_payoff(x, y):
            return (2**x) / (2**x + 2**y)
        winner_diff = 1 - calculate_payoff(winner.elo, loser.elo)
        loser_diff = -calculate_payoff(loser.elo, winner.elo)
        winner.elo += winner_diff
        loser.elo += loser_diff
        winner.save()
        loser.save()
        return Response({
            "winner_elo": round(winner.elo, 2),
            "loser_elo": round(loser.elo, 2)
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        if request.user.username.strip() != 'stats':
            raise PermissionDenied("API permission denied")
        top_fighter = Fighter.objects.order_by('-elo').first()
        bottom_fighter = Fighter.objects.order_by('elo').first()
        num_fighters = Fighter.objects.count()
        return Response({
            "top_fighter": FighterSerializer(top_fighter).data if top_fighter else {},
            "bottom_fighter": FighterSerializer(bottom_fighter).data if bottom_fighter else {},
            "num_fighters": num_fighters or 0
        }, status=status.HTTP_200_OK)

class GlobalViewSet(BaseViewSet, mixins.UpdateModelMixin):
    queryset = Global.objects.all()
    serializer_class = GlobalSerializer
    lookup_field = 'g_id'
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]