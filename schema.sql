--
-- PostgreSQL database dump
--

\restrict rGPStH58UcqfKt1dwuOplmmwbY5q2hNLCJEg4EwFJ1Pa2M76diSmT6ILIB8rKiI

-- Dumped from database version 17.9
-- Dumped by pg_dump version 17.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: annonces; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.annonces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    utilisateur_id uuid,
    titre character varying(255) NOT NULL,
    description text,
    categorie character varying(50) NOT NULL,
    type_transaction character varying(20) NOT NULL,
    prix numeric(15,2) NOT NULL,
    devise character varying(10) DEFAULT 'XOF'::character varying,
    superficie numeric(10,2),
    nb_pieces integer,
    ville character varying(100),
    quartier character varying(100),
    adresse_complete text,
    latitude numeric(10,8),
    longitude numeric(11,8),
    disponible_du date,
    disponible_au date,
    statut character varying(20) DEFAULT 'en_attente'::character varying,
    est_sponsorisee boolean DEFAULT false,
    nb_vues integer DEFAULT 0,
    nb_interets integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    periode character varying(20) DEFAULT 'mois'::character varying,
    sponsorisee_jusqu_au timestamp without time zone,
    nb_vues_sponsorisee integer DEFAULT 0,
    CONSTRAINT annonces_statut_check CHECK (((statut)::text = ANY ((ARRAY['publiee'::character varying, 'en_attente'::character varying, 'rejetee'::character varying, 'suspendue'::character varying, 'loue'::character varying, 'vendu'::character varying])::text[])))
);


ALTER TABLE public.annonces OWNER TO postgres;

--
-- Name: avis; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.avis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    annonce_id uuid,
    auteur_id uuid,
    destinataire_id uuid,
    note integer,
    commentaire text,
    type character varying(20) DEFAULT 'vendeur'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT avis_note_check CHECK (((note >= 1) AND (note <= 5)))
);


ALTER TABLE public.avis OWNER TO postgres;

--
-- Name: disponibilites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.disponibilites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    annonce_id uuid,
    date_debut date NOT NULL,
    date_fin date NOT NULL,
    statut character varying(20) DEFAULT 'indisponible'::character varying,
    motif character varying(100),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.disponibilites OWNER TO postgres;

--
-- Name: documents_annonce; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents_annonce (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    annonce_id uuid,
    nom character varying(255) NOT NULL,
    type_document character varying(100),
    url character varying(500) NOT NULL,
    taille integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.documents_annonce OWNER TO postgres;

--
-- Name: litiges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.litiges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    paiement_id uuid,
    plaignant_id uuid,
    accuse_id uuid,
    motif text NOT NULL,
    description text,
    statut character varying(20) DEFAULT 'ouvert'::character varying,
    decision text,
    admin_id uuid,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.litiges OWNER TO postgres;

--
-- Name: medias; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.medias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    annonce_id uuid,
    type_media character varying(10) NOT NULL,
    url character varying(500) NOT NULL,
    public_id character varying(255),
    est_principale boolean DEFAULT false,
    ordre integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.medias OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    annonce_id uuid,
    expediteur_id uuid,
    destinataire_id uuid,
    contenu text NOT NULL,
    est_suspect boolean DEFAULT false,
    est_lu boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    utilisateur_id uuid,
    type character varying(50) NOT NULL,
    titre character varying(255) NOT NULL,
    message text NOT NULL,
    lien character varying(500),
    est_lu boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: paiements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.paiements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    annonce_id uuid,
    acheteur_id uuid,
    vendeur_id uuid,
    montant numeric(15,2) NOT NULL,
    devise character varying(10) DEFAULT 'XOF'::character varying,
    methode_paiement character varying(50) NOT NULL,
    statut character varying(20) DEFAULT 'en_attente'::character varying,
    reference_transaction character varying(255),
    commission_plateforme numeric(15,2) DEFAULT 0,
    taux_commission numeric(5,2) DEFAULT 0,
    recu_url character varying(500),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    zone integer DEFAULT 1
);


ALTER TABLE public.paiements OWNER TO postgres;

--
-- Name: sponsorisations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sponsorisations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    annonce_id uuid,
    utilisateur_id uuid,
    duree_jours integer NOT NULL,
    montant integer NOT NULL,
    devise character varying(10) DEFAULT 'XOF'::character varying,
    statut character varying(20) DEFAULT 'en_attente'::character varying,
    date_debut timestamp without time zone,
    date_fin timestamp without time zone,
    reference_paiement character varying(100),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.sponsorisations OWNER TO postgres;

--
-- Name: utilisateurs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.utilisateurs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nom character varying(100) NOT NULL,
    prenom character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    telephone character varying(20) NOT NULL,
    mot_de_passe character varying(255) NOT NULL,
    photo_profil character varying(500),
    photo_couverture character varying(500),
    type_compte character varying(20) DEFAULT 'particulier'::character varying,
    statut character varying(20) DEFAULT 'en_attente'::character varying,
    est_verifie boolean DEFAULT false,
    langue character varying(5) DEFAULT 'fr'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    photo_profil_url character varying(500),
    cnib_recto_url character varying(500),
    cnib_verso_url character varying(500),
    mobile_money_numero character varying(50),
    mobile_money_operateur character varying(50),
    email_verifie boolean DEFAULT false,
    email_verification_token character varying(255),
    email_verification_expires timestamp without time zone,
    reset_password_token character varying(255),
    reset_password_expires timestamp without time zone,
    pays character varying(5) DEFAULT 'BF'::character varying
);


ALTER TABLE public.utilisateurs OWNER TO postgres;

--
-- Name: annonces annonces_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.annonces
    ADD CONSTRAINT annonces_pkey PRIMARY KEY (id);


--
-- Name: avis avis_annonce_id_auteur_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avis
    ADD CONSTRAINT avis_annonce_id_auteur_id_key UNIQUE (annonce_id, auteur_id);


--
-- Name: avis avis_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avis
    ADD CONSTRAINT avis_pkey PRIMARY KEY (id);


--
-- Name: disponibilites disponibilites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilites
    ADD CONSTRAINT disponibilites_pkey PRIMARY KEY (id);


--
-- Name: documents_annonce documents_annonce_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_annonce
    ADD CONSTRAINT documents_annonce_pkey PRIMARY KEY (id);


--
-- Name: litiges litiges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.litiges
    ADD CONSTRAINT litiges_pkey PRIMARY KEY (id);


--
-- Name: medias medias_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medias
    ADD CONSTRAINT medias_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: paiements paiements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paiements
    ADD CONSTRAINT paiements_pkey PRIMARY KEY (id);


--
-- Name: sponsorisations sponsorisations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sponsorisations
    ADD CONSTRAINT sponsorisations_pkey PRIMARY KEY (id);


--
-- Name: utilisateurs utilisateurs_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_email_key UNIQUE (email);


--
-- Name: utilisateurs utilisateurs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_pkey PRIMARY KEY (id);


--
-- Name: utilisateurs utilisateurs_telephone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.utilisateurs
    ADD CONSTRAINT utilisateurs_telephone_key UNIQUE (telephone);


--
-- Name: annonces annonces_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.annonces
    ADD CONSTRAINT annonces_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateurs(id) ON DELETE CASCADE;


--
-- Name: avis avis_annonce_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avis
    ADD CONSTRAINT avis_annonce_id_fkey FOREIGN KEY (annonce_id) REFERENCES public.annonces(id) ON DELETE CASCADE;


--
-- Name: avis avis_auteur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avis
    ADD CONSTRAINT avis_auteur_id_fkey FOREIGN KEY (auteur_id) REFERENCES public.utilisateurs(id) ON DELETE CASCADE;


--
-- Name: avis avis_destinataire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.avis
    ADD CONSTRAINT avis_destinataire_id_fkey FOREIGN KEY (destinataire_id) REFERENCES public.utilisateurs(id) ON DELETE CASCADE;


--
-- Name: disponibilites disponibilites_annonce_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disponibilites
    ADD CONSTRAINT disponibilites_annonce_id_fkey FOREIGN KEY (annonce_id) REFERENCES public.annonces(id) ON DELETE CASCADE;


--
-- Name: documents_annonce documents_annonce_annonce_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents_annonce
    ADD CONSTRAINT documents_annonce_annonce_id_fkey FOREIGN KEY (annonce_id) REFERENCES public.annonces(id) ON DELETE CASCADE;


--
-- Name: litiges litiges_accuse_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.litiges
    ADD CONSTRAINT litiges_accuse_id_fkey FOREIGN KEY (accuse_id) REFERENCES public.utilisateurs(id) ON DELETE CASCADE;


--
-- Name: litiges litiges_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.litiges
    ADD CONSTRAINT litiges_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.utilisateurs(id);


--
-- Name: litiges litiges_paiement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.litiges
    ADD CONSTRAINT litiges_paiement_id_fkey FOREIGN KEY (paiement_id) REFERENCES public.paiements(id) ON DELETE CASCADE;


--
-- Name: litiges litiges_plaignant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.litiges
    ADD CONSTRAINT litiges_plaignant_id_fkey FOREIGN KEY (plaignant_id) REFERENCES public.utilisateurs(id) ON DELETE CASCADE;


--
-- Name: medias medias_annonce_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.medias
    ADD CONSTRAINT medias_annonce_id_fkey FOREIGN KEY (annonce_id) REFERENCES public.annonces(id) ON DELETE CASCADE;


--
-- Name: messages messages_annonce_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_annonce_id_fkey FOREIGN KEY (annonce_id) REFERENCES public.annonces(id) ON DELETE CASCADE;


--
-- Name: messages messages_destinataire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_destinataire_id_fkey FOREIGN KEY (destinataire_id) REFERENCES public.utilisateurs(id) ON DELETE CASCADE;


--
-- Name: messages messages_expediteur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_expediteur_id_fkey FOREIGN KEY (expediteur_id) REFERENCES public.utilisateurs(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateurs(id) ON DELETE CASCADE;


--
-- Name: paiements paiements_acheteur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paiements
    ADD CONSTRAINT paiements_acheteur_id_fkey FOREIGN KEY (acheteur_id) REFERENCES public.utilisateurs(id) ON DELETE CASCADE;


--
-- Name: paiements paiements_annonce_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paiements
    ADD CONSTRAINT paiements_annonce_id_fkey FOREIGN KEY (annonce_id) REFERENCES public.annonces(id) ON DELETE CASCADE;


--
-- Name: paiements paiements_vendeur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.paiements
    ADD CONSTRAINT paiements_vendeur_id_fkey FOREIGN KEY (vendeur_id) REFERENCES public.utilisateurs(id) ON DELETE CASCADE;


--
-- Name: sponsorisations sponsorisations_annonce_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sponsorisations
    ADD CONSTRAINT sponsorisations_annonce_id_fkey FOREIGN KEY (annonce_id) REFERENCES public.annonces(id) ON DELETE CASCADE;


--
-- Name: sponsorisations sponsorisations_utilisateur_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sponsorisations
    ADD CONSTRAINT sponsorisations_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES public.utilisateurs(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict rGPStH58UcqfKt1dwuOplmmwbY5q2hNLCJEg4EwFJ1Pa2M76diSmT6ILIB8rKiI

