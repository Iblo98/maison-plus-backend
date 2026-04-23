'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { User, CreditCard, Lock, Camera } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Parametres() {
  const { utilisateur, chargement: authChargement } = useAuth();
  const router = useRouter();
  const [onglet, setOnglet] = useState('profil');
  const [chargement, setChargement] = useState(false);
  const [kyc, setKyc] = useState(null);

  // Formulaires
  const [formProfil, setFormProfil] = useState({
    nom: '', prenom: '', telephone: '', langue: 'fr'
  });
  const [photoProfil, setPhotoProfil] = useState(null);
  const [formPaiement, setFormPaiement] = useState({
    mobile_money_numero: '',
    mobile_money_operateur: 'Orange Money'
  });
  const [formMotDePasse, setFormMotDePasse] = useState({
    ancien_mot_de_passe: '',
    nouveau_mot_de_passe: '',
    confirmation: ''
  });

  useEffect(() => {
    if (!authChargement && !utilisateur) {
      router.push('/connexion');
      return;
    }
    if (utilisateur) {
      setFormProfil({
        nom: utilisateur.nom || '',
        prenom: utilisateur.prenom || '',
        telephone: utilisateur.telephone || '',
        langue: utilisateur.langue || 'fr'
      });
      chargerKYC();
    }
  }, [utilisateur, authChargement]);

  const chargerKYC = async () => {
    try {
      const response = await api.get('/kyc/statut');
      setKyc(response.data);
      if (response.data.mobile_money_numero) {
        setFormPaiement({
          mobile_money_numero: response.data.mobile_money_numero || '',
          mobile_money_operateur: response.data.mobile_money_operateur || 'Orange Money'
        });
      }
    } catch (err) {
      console.error('Erreur KYC:', err);
    }
  };

  const sauvegarderProfil = async () => {
    setChargement(true);
    try {
      await api.put('/profil/moi', formProfil);
      toast.success('Profil mis à jour !');
    } catch (erreur) {
      toast.error(erreur?.response?.data?.message || 'Erreur');
    } finally {
      setChargement(false);
    }
  };

  const uploadPhotoProfil = async () => {
    if (!photoProfil) {
      toast.error('Sélectionnez une photo');
      return;
    }
    setChargement(true);
    try {
      const formData = new FormData();
      formData.append('photo', photoProfil);
      const response = await fetch('http://localhost:3000/api/kyc/photo-profil', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      const data = await response.json();
      if (data.succes) {
        toast.success('Photo de profil mise à jour !');
        setPhotoProfil(null);
        chargerKYC();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error('Erreur upload photo');
    } finally {
      setChargement(false);
    }
  };

  const sauvegarderPaiement = async () => {
    setChargement(true);
    try {
      await api.post('/kyc/paiement', formPaiement);
      toast.success('Informations de paiement mises à jour !');
      chargerKYC();
    } catch (erreur) {
      toast.error(erreur?.response?.data?.message || 'Erreur');
    } finally {
      setChargement(false);
    }
  };

  const changerMotDePasse = async () => {
    if (formMotDePasse.nouveau_mot_de_passe !== formMotDePasse.confirmation) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (formMotDePasse.nouveau_mot_de_passe.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    setChargement(true);
    try {
      await api.put('/profil/moi/mot-de-passe', {
        ancien_mot_de_passe: formMotDePasse.ancien_mot_de_passe,
        nouveau_mot_de_passe: formMotDePasse.nouveau_mot_de_passe
      });
      toast.success('Mot de passe changé avec succès !');
      setFormMotDePasse({ ancien_mot_de_passe: '', nouveau_mot_de_passe: '', confirmation: '' });
    } catch (erreur) {
      toast.error(erreur?.response?.data?.message || 'Erreur');
    } finally {
      setChargement(false);
    }
  };

  const onglets = [
    { id: 'profil', label: 'Profil', icon: User },
    { id: 'photo', label: 'Photo', icon: Camera },
    { id: 'paiement', label: 'Paiement', icon: CreditCard },
    { id: 'securite', label: 'Sécurité', icon: Lock },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Paramètres</h1>

        {/* Onglets */}
        <div className="flex gap-2 mb-6 bg-white rounded-2xl p-2 shadow-sm">
          {onglets.map((o) => {
            const Icon = o.icon;
            return (
              <button key={o.id} onClick={() => setOnglet(o.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-medium transition ${
                  onglet === o.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}>
                <Icon size={16} />
                <span className="hidden sm:block">{o.label}</span>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">

          {/* Onglet Profil */}
          {onglet === 'profil' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Informations personnelles</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input type="text" value={formProfil.nom}
                    onChange={(e) => setFormProfil({...formProfil, nom: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input type="text" value={formProfil.prenom}
                    onChange={(e) => setFormProfil({...formProfil, prenom: e.target.value})}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input type="tel" value={formProfil.telephone}
                  onChange={(e) => setFormProfil({...formProfil, telephone: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Langue</label>
                <select value={formProfil.langue}
                  onChange={(e) => setFormProfil({...formProfil, langue: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition">
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>

              <button onClick={sauvegarderProfil} disabled={chargement}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50">
                {chargement ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          )}

          {/* Onglet Photo */}
          {onglet === 'photo' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Photo de profil</h2>

              {kyc?.etapes?.photo_profil && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm">
                  ✅ Photo de profil déjà configurée
                </div>
              )}

              <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition cursor-pointer">
                {photoProfil ? (
                  <div>
                    <img src={URL.createObjectURL(photoProfil)} alt="Aperçu"
                      className="w-24 h-24 rounded-full object-cover mx-auto mb-3" />
                    <p className="text-green-600 font-medium">{photoProfil.name}</p>
                  </div>
                ) : (
                  <div>
                    <Camera size={48} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Cliquez pour sélectionner une photo</p>
                    <p className="text-gray-400 text-sm mt-1">JPG, PNG ou HEIC — Max 10MB</p>
                  </div>
                )}
                <input type="file" accept="image/*"
                  onChange={(e) => setPhotoProfil(e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>

              <button onClick={uploadPhotoProfil} disabled={chargement || !photoProfil}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50">
                {chargement ? 'Upload...' : 'Mettre à jour la photo'}
              </button>
            </div>
          )}

          {/* Onglet Paiement */}
          {onglet === 'paiement' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Mobile Money</h2>

              {kyc?.etapes?.paiement_configure && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm">
                  ✅ Mobile Money déjà configuré
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opérateur</label>
                <select value={formPaiement.mobile_money_operateur}
                  onChange={(e) => setFormPaiement({...formPaiement, mobile_money_operateur: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition">
                  <option>Orange Money</option>
                  <option>MobiCash</option>
                  <option>Telecel Money</option>
                  <option>Coris Money</option>
                  <option>Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro Mobile Money</label>
                <input type="tel" value={formPaiement.mobile_money_numero}
                  onChange={(e) => setFormPaiement({...formPaiement, mobile_money_numero: e.target.value})}
                  placeholder="Ex: 70000000"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                />
              </div>

              <p className="text-gray-400 text-xs">
                Ces informations sont privées et chiffrées. Jamais partagées avec d&apos;autres utilisateurs.
              </p>

              <button onClick={sauvegarderPaiement} disabled={chargement || !formPaiement.mobile_money_numero}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50">
                {chargement ? 'Sauvegarde...' : 'Mettre à jour'}
              </button>
            </div>
          )}

          {/* Onglet Sécurité */}
          {onglet === 'securite' && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Changer le mot de passe</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ancien mot de passe</label>
                <input type="password" value={formMotDePasse.ancien_mot_de_passe}
                  onChange={(e) => setFormMotDePasse({...formMotDePasse, ancien_mot_de_passe: e.target.value})}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                <input type="password" value={formMotDePasse.nouveau_mot_de_passe}
                  onChange={(e) => setFormMotDePasse({...formMotDePasse, nouveau_mot_de_passe: e.target.value})}
                  placeholder="Minimum 8 caractères"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
                <input type="password" value={formMotDePasse.confirmation}
                  onChange={(e) => setFormMotDePasse({...formMotDePasse, confirmation: e.target.value})}
                  placeholder="Répétez le nouveau mot de passe"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                />
              </div>

              <button onClick={changerMotDePasse} disabled={chargement}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition disabled:opacity-50">
                {chargement ? 'Changement...' : 'Changer le mot de passe'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}